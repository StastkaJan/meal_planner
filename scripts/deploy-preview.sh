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
    rm -f "$env_file"
  fi
  echo "deleted preview $preview_id"
  exit 0
fi

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
compose build app
compose run --rm --no-deps app node scripts-dist/migrate.js
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
