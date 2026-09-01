#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "usage: $0 DEPLOYMENT_VERSION | rollback" >&2
  exit 2
fi

action=deploy
requested_version="$1"
if [[ "$requested_version" == rollback ]]; then
  action=rollback
fi

valid_version() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]]
}

if [[ "$action" == deploy ]] && ! valid_version "$requested_version"; then
  echo "invalid deployment version: $requested_version" >&2
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

docker network inspect public-web >/dev/null 2>&1 || docker network create public-web

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

write_version() {
  local slot="$1"
  local version="$2"
  printf '%s\n' "$version" >".deploy/$slot-version.tmp"
  mv ".deploy/$slot-version.tmp" ".deploy/$slot-version"
}

public_health() {
  local domain
  domain="${DOMAIN:-}"
  if [[ -z "$domain" ]]; then
    domain="$(sed -n 's/^DOMAIN=//p' .env.production | tail -n 1)"
  fi
  if [[ ! "$domain" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "DOMAIN must be an unquoted hostname in .env.production" >&2
    return 1
  fi

  for _ in {1..15}; do
    if curl --fail --silent --show-error --output /dev/null --proto '=https' \
      "https://$domain/health"; then
      return 0
    fi
    sleep 2
  done
  return 1
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

rollback_failed_switch() {
  local status=$?
  trap - ERR

  if [[ "$switch_attempted" == true && -n "$active" ]]; then
    echo "health check failed; switching back to app-$active" >&2
    write_upstream "$active"
    compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile || true
  fi

  compose stop "$target_service" >/dev/null 2>&1 || true
  compose rm -f "$target_service" >/dev/null 2>&1 || true
  exit "$status"
}
trap rollback_failed_switch ERR

if [[ "$action" == rollback ]]; then
  if [[ -z "$active" ]]; then
    echo "cannot roll back before the first blue/green deployment" >&2
    exit 1
  fi

  version_file=".deploy/$target-version"
  if [[ ! -f "$version_file" ]]; then
    echo "missing rollback version state: $version_file" >&2
    exit 1
  fi
  DEPLOYMENT_VERSION="$(<"$version_file")"
  if ! valid_version "$DEPLOYMENT_VERSION"; then
    echo "invalid rollback version state: $DEPLOYMENT_VERSION" >&2
    exit 1
  fi
  export DEPLOYMENT_VERSION

  compose config --quiet
  compose up -d --no-deps --no-build --wait --wait-timeout 120 "$target_service"
  switch_attempted=true
  write_upstream "$target"
  compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile
  if ! public_health; then
    echo "rolled-back release did not pass its public health check" >&2
    false
  fi

  printf '%s\n' "$target" >.deploy/active-slot
  switch_attempted=false
  old_service="app-$active"
  compose stop "$old_service" || true
  compose rm -f "$old_service" || true
  echo "rolled back to $DEPLOYMENT_VERSION on app-$target"
  exit 0
fi

DEPLOYMENT_VERSION="$requested_version"
export DEPLOYMENT_VERSION

compose config --quiet
compose up -d --wait --wait-timeout 120 db
compose run --rm --build backup once

if [[ -n "$active" && ! -f ".deploy/$active-version" ]]; then
  active_version="$(compose exec -T "app-$active" printenv DEPLOYMENT_VERSION)"
  if ! valid_version "$active_version"; then
    echo "cannot record active deployment version: $active_version" >&2
    exit 1
  fi
  write_version "$active" "$active_version"
fi

compose build "$target_service"
compose run --rm --no-deps "$target_service" node scripts-dist/migrate.js
compose up -d --no-deps --wait --wait-timeout 120 "$target_service"

if ! compose ps --services --status running | grep -qx proxy; then
  write_upstream "${active:-$target}"
fi

compose up -d --wait --wait-timeout 120 \
  backup prometheus loki alloy grafana
compose up -d --wait --wait-timeout 120 proxy

switch_attempted=true
write_upstream "$target"
compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile
if ! public_health; then
  echo "new deployment did not pass its public health check" >&2
  false
fi

write_version "$target" "$DEPLOYMENT_VERSION"
printf '%s\n' "$target" >.deploy/active-slot
switch_attempted=false

old_service="${active:+app-$active}"
old_service="${old_service:-app}"
compose stop "$old_service" || true
compose rm -f "$old_service" || true

echo "deployed $DEPLOYMENT_VERSION on app-$target"
