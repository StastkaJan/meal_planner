#!/bin/sh
set -eu

notify_failure() {
	message="Database backup failed: $1"
	printf '{"level":"error","event":"database_backup_failed","message":"%s"}\n' "$message" >&2

	if [ -n "${BACKUP_FAILURE_WEBHOOK_URL:-}" ]; then
		curl --fail --silent --show-error \
			-H 'Content-Type: application/json' \
			-d "{\"text\":\"$message\"}" \
			"$BACKUP_FAILURE_WEBHOOK_URL" || true
	fi
}

run_backup() {
	if ! dump_file="$(mktemp /tmp/mealplan-XXXXXX.dump)"; then
		notify_failure 'temporary dump creation failed'
		exit 1
	fi
	trap 'rm -f "$dump_file"' 0

	if ! pg_dump --format=custom --file="$dump_file" "$DATABASE_URL"; then
		notify_failure 'pg_dump failed'
		exit 1
	fi

	if ! restic backup --tag meal-plan --stdin-filename mealplan.dump < "$dump_file"; then
		notify_failure 'upload failed'
		exit 1
	fi
	rm -f "$dump_file"
	trap - 0

	if ! restic forget --tag meal-plan --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune; then
		notify_failure 'retention cleanup failed'
		exit 1
	fi

	printf '{"level":"info","event":"database_backup_succeeded"}\n'
}

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

if ! restic cat config >/dev/null 2>&1 && ! restic init; then
	notify_failure 'repository initialization failed'
	exit 1
fi

run_backup

if [ "${1:-}" = 'schedule' ]; then
	exec crond -f -l 2
fi
