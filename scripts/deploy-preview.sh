#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 deploy PR_NUMBER DEPLOYMENT_VERSION | delete PR_NUMBER" >&2
  exit 2
fi

action="$1"
pr_number="$2"
deployment_version="${3:-deleted}"

if [[ "$action" != deploy && "$action" != delete ]]; then
  echo "action must be deploy or delete" >&2
  exit 2
fi
if [[ ! "$pr_number" =~ ^[1-9][0-9]*$ ]]; then
  echo "invalid pull request number: $pr_number" >&2
  exit 2
fi
if [[ ! "$deployment_version" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]]; then
  echo "invalid deployment version: $deployment_version" >&2
  exit 2
fi
: "${PREVIEW_ROOT:?Set PREVIEW_ROOT to the persistent preview state directory}"
: "${PREVIEW_EDGE_ROOT:?Set PREVIEW_EDGE_ROOT to the portfolio deployment directory}"

mkdir -p "$PREVIEW_ROOT"
preview_root="$(cd "$PREVIEW_ROOT" && pwd -P)"
if [[ "$preview_root" == / ]]; then
  echo "PREVIEW_ROOT cannot be /" >&2
  exit 2
fi
if [[ ! -f "$PREVIEW_EDGE_ROOT/docker-compose.yml" || ! -f "$PREVIEW_EDGE_ROOT/Caddyfile" ]]; then
  echo "PREVIEW_EDGE_ROOT must contain the portfolio Caddy deployment" >&2
  exit 1
fi
edge_root="$(cd "$PREVIEW_EDGE_ROOT" && pwd -P)"

edge_routes_dir="$edge_root/preview-routes"
mkdir -p "$preview_root/env" "$edge_routes_dir"
exec 9>"$preview_root/deploy.lock"
if ! flock -w 900 9; then
  echo "timed out waiting for another preview deployment" >&2
  exit 1
fi

preview_id="pr-$pr_number"
project="meal-plan-$preview_id"
env_file="$preview_root/env/$preview_id.env"
snapshot_marker="$preview_root/env/$preview_id.production-snapshot"
route_file="$edge_routes_dir/$preview_id.caddy"

export PREVIEW_ID="$preview_id"
export PREVIEW_BUILD_CONTEXT="$(pwd -P)"

compose() {
  docker compose \
    --env-file "$env_file" \
    --project-name "$project" \
    --file docker-compose.preview.yml \
    "$@"
}

edge_compose() {
  docker compose \
    --project-directory "$edge_root" \
    --file "$edge_root/docker-compose.yml" \
    "$@"
}

reload_edge() {
  edge_compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
  edge_compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
}

if [[ "$action" == delete ]]; then
  rm -f "$route_file"
  reload_edge

  if [[ -f "$env_file" ]]; then
    compose down --volumes --remove-orphans --rmi local
  fi
  rm -f "$env_file" "$snapshot_marker"
  echo "deleted preview $preview_id"
  exit 0
fi

: "${PREVIEW_PRODUCTION_ROOT:?Set PREVIEW_PRODUCTION_ROOT to the production deployment directory}"
if [[ ! -f "$PREVIEW_PRODUCTION_ROOT/.env.production" ]]; then
  echo "PREVIEW_PRODUCTION_ROOT must contain .env.production" >&2
  exit 1
fi
production_root="$(cd "$PREVIEW_PRODUCTION_ROOT" && pwd -P)"

production_compose() {
  docker compose \
    --project-directory "$production_root" \
    --env-file "$production_root/.env.production" \
    --file "$production_root/docker-compose.yml" \
    --file "$production_root/docker-compose.production.yml" \
    "$@"
}

: "${PREVIEW_BASE_DOMAIN:?Set PREVIEW_BASE_DOMAIN, for example papuplan.cz}"
if [[ ! "$PREVIEW_BASE_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "invalid preview base domain: $PREVIEW_BASE_DOMAIN" >&2
  exit 2
fi

domain="$preview_id.$PREVIEW_BASE_DOMAIN"
if [[ -f "$env_file" ]]; then
  postgres_password="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$env_file" | tail -n 1)"
  if [[ ! "$postgres_password" =~ ^[a-f0-9]{64}$ ]]; then
    echo "invalid stored preview database password" >&2
    exit 1
  fi
else
  postgres_password="$(openssl rand -hex 32)"
fi

cat >"$env_file.tmp" <<EOF
POSTGRES_PASSWORD=$postgres_password
DOMAIN=$domain
DEPLOYMENT_VERSION=$deployment_version
EOF
chmod 600 "$env_file.tmp"
mv "$env_file.tmp" "$env_file"

docker network inspect public-web >/dev/null 2>&1 || docker network create public-web
compose config --quiet
compose up -d --wait --wait-timeout 120 db

imported_snapshot=false
if [[ ! -f "$snapshot_marker" ]]; then
  echo "loading a production snapshot into $preview_id"
  compose exec -T db psql -v ON_ERROR_STOP=1 -U mealplan -d mealplan \
    -c 'DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION mealplan;'
  production_compose exec -T db pg_dump \
    -U mealplan \
    -d mealplan \
    --no-owner \
    --no-privileges \
    --exclude-table-data=public.sessions \
    | compose exec -T db psql -v ON_ERROR_STOP=1 -U mealplan -d mealplan
  imported_snapshot=true
fi

compose build app
compose run --rm --no-deps app node scripts-dist/migrate.js
if [[ "$imported_snapshot" == true ]]; then
  printf '%s\n' "$deployment_version" >"$snapshot_marker.tmp"
  mv "$snapshot_marker.tmp" "$snapshot_marker"
fi
compose up -d --no-deps --wait --wait-timeout 120 app

cat >"$route_file.tmp" <<EOF
$domain {
	reverse_proxy $preview_id-app:3000
}
EOF
mv "$route_file.tmp" "$route_file"
reload_edge

for _ in {1..20}; do
  if curl --fail --silent --show-error --output /dev/null --proto '=https' \
    "https://$domain/health"; then
    echo "deployed preview at https://$domain"
    exit 0
  fi
  sleep 3
done

echo "preview did not pass its public health check: https://$domain/health" >&2
exit 1
