#!/bin/sh
set -eu

notify_failure() {
	message="Application restore verification failed: $1"
	printf '{"level":"error","event":"application_restore_verification_failed","message":"%s"}\n' "$message" >&2

	if [ -n "${ALERTMANAGER_URL:-}" ]; then
		curl --fail --silent --show-error --retry 3 --retry-all-errors \
			-H 'Content-Type: application/json' \
			-d "[{\"labels\":{\"alertname\":\"RestoreVerificationFailed\",\"severity\":\"critical\"},\"annotations\":{\"summary\":\"Application restore verification failed\",\"description\":\"$1\"}}]" \
			"$ALERTMANAGER_URL/api/v2/alerts" || true
	fi
}

reset_database() {
	psql "$RESTORE_DATABASE_URL" --set ON_ERROR_STOP=1 \
		--command 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
}

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

if [ "$(psql "$RESTORE_DATABASE_URL" --tuples-only --no-align --command \
	"SELECT marker FROM restore_guard.disposable_target")" != 'meal-plan-restore-check' ]; then
	notify_failure 'target is not the disposable restore database'
	exit 1
fi

if ! restore_dir="$(mktemp -d /tmp/mealplan-restore-XXXXXX)"; then
	notify_failure 'temporary restore directory creation failed'
	exit 1
fi
trap 'rm -rf "$restore_dir"' 0

if ! restic restore latest --tag meal-plan --target "$restore_dir"; then
	notify_failure 'snapshot download failed'
	exit 1
fi

dump_file="$(find "$restore_dir" -type f -name mealplan.dump -print -quit)"
if [ -z "$dump_file" ]; then
	notify_failure 'snapshot does not contain mealplan.dump'
	exit 1
fi

image_dir="$(find "$restore_dir" -type d -path '*/data/recipe-images' -print -quit)"
if [ -z "$image_dir" ]; then
	notify_failure 'snapshot does not contain recipe image storage'
	exit 1
fi

if ! reset_database; then
	notify_failure 'disposable database cleanup failed'
	exit 1
fi

if ! pg_restore --no-owner --no-privileges --dbname "$RESTORE_DATABASE_URL" "$dump_file"; then
	notify_failure 'pg_restore failed'
	reset_database || true
	exit 1
fi

if ! psql "$RESTORE_DATABASE_URL" --set ON_ERROR_STOP=1 \
	--command 'SELECT count(*) FROM users;' >/dev/null; then
	notify_failure 'restored data validation failed'
	reset_database || true
	exit 1
fi

if ! reset_database; then
	notify_failure 'post-verification cleanup failed'
	exit 1
fi

printf '{"level":"info","event":"application_restore_verification_succeeded"}\n'
