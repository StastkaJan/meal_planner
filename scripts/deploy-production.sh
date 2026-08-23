#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "usage: $0 DEPLOYMENT_VERSION" >&2
  exit 2
fi

if [[ ! -f .env.production ]]; then
  echo "missing $(pwd)/.env.production" >&2
  exit 1
fi

mkdir -p .deploy
chmod 700 .deploy
chmod 600 .env.production

exec 9>.deploy/deploy.lock
if ! flock -n 9; then
  echo "another production deployment is running" >&2
  exit 1
fi

export DEPLOYMENT_VERSION="$1"

compose() {
  docker compose \
    --env-file .env.production \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    --profile production \
    --profile development \
    --profile blue \
    --profile green \
    "$@"
}

write_upstream() {
  local slot="$1"
  printf '(active_backend) {\n\treverse_proxy app-%s:3000\n}\n' "$slot" \
    >.deploy/active-upstream.caddy.tmp
  mv .deploy/active-upstream.caddy.tmp .deploy/active-upstream.caddy
}

active=""
if [[ -f .deploy/active-slot ]]; then
  active="$(<.deploy/active-slot)"
fi

case "$active" in
  "" | green) target="blue" ;;
  blue) target="green" ;;
  *)
    echo "invalid active deployment slot: $active" >&2
    exit 1
    ;;
esac

target_service="app-$target"
switch_attempted=false

rollback() {
  local status=$?
  trap - ERR

  if [[ "$switch_attempted" == true && -n "$active" ]]; then
    echo "health check failed; switching back to app-$active" >&2
    write_upstream "$active"
    compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile || true
  fi

  if [[ -n "$active" ]]; then
    compose stop "$target_service" >/dev/null 2>&1 || true
    compose rm -f "$target_service" >/dev/null 2>&1 || true
  fi

  exit "$status"
}
trap rollback ERR

compose config --quiet
compose up -d --wait --wait-timeout 120 db
compose build "$target_service"
compose run --rm --no-deps "$target_service" node scripts-dist/migrate.js
compose up -d --no-deps --wait --wait-timeout 120 "$target_service"

if ! compose ps --services --status running | grep -qx proxy; then
  write_upstream "${active:-$target}"
fi

compose up -d --no-recreate --wait --wait-timeout 120 \
  backup prometheus loki alloy grafana proxy

switch_attempted=true
write_upstream "$target"
compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile

domain="$(sed -n 's/^DOMAIN=//p' .env.production | tail -n 1)"
if [[ ! "$domain" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "DOMAIN must be an unquoted hostname in .env.production" >&2
  false
fi

healthy=false
for _ in {1..15}; do
  if curl --fail --silent --show-error --output /dev/null --proto '=https' \
    "https://$domain/health"; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  echo "new deployment did not pass its public health check" >&2
  false
fi

printf '%s\n' "$target" >.deploy/active-slot
switch_attempted=false

old_service="${active:+app-$active}"
old_service="${old_service:-app}"
compose stop "$old_service" || true
compose rm -f "$old_service" || true

echo "deployed $DEPLOYMENT_VERSION on app-$target"
