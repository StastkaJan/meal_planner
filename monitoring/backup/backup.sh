#!/bin/sh
set -eu

notify_failure() {
	message="Database backup failed: $1"
	printf '{"level":"error","event":"database_backup_failed","message":"%s"}\n' "$message" >&2

	if [ -n "${ALERTMANAGER_URL:-}" ]; then
		curl --fail --silent --show-error --retry 3 --retry-all-errors \
			-H 'Content-Type: application/json' \
			-d "[{\"labels\":{\"alertname\":\"BackupFailed\",\"severity\":\"critical\"},\"annotations\":{\"summary\":\"Database backup failed\",\"description\":\"$1\"}}]" \
			"$ALERTMANAGER_URL/api/v2/alerts" || true
	fi
}

apply_retention() {
	restic forget --tag meal-plan --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
}

run_backup() {
	if ! dump_file="$(mktemp /tmp/mealplan-dump-XXXXXX)"; then
		notify_failure 'temporary dump creation failed'
		exit 1
	fi
	trap 'rm -f "$dump_file"' 0

	if ! pg_dump --format=custom --file="$dump_file" "$DATABASE_URL"; then
		notify_failure 'pg_dump failed'
		exit 1
	fi

	if ! restic backup --tag meal-plan --stdin --stdin-filename mealplan.dump < "$dump_file"; then
		notify_failure 'upload failed'
		exit 1
	fi
	rm -f "$dump_file"
	trap - 0

	printf '{"level":"info","event":"database_backup_succeeded"}\n'
}

mode="${1:-once}"

if [ "$mode" = 'schedule' ]; then
	exec crond -f -l 2
fi

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

if [ "$mode" = 'init' ]; then
	if ! restic init; then
		notify_failure 'repository initialization failed'
		exit 1
	fi
	exit 0
fi

if ! restic cat config >/dev/null; then
	notify_failure 'repository access check failed'
	exit 1
fi

case "$mode" in
	once)
		: "${DATABASE_URL:?DATABASE_URL is required}"
		run_backup
		;;
	retention)
		if ! apply_retention; then
			notify_failure 'retention cleanup failed'
			exit 1
		fi
		printf '{"level":"info","event":"database_backup_retention_succeeded"}\n'
		;;
	*)
		echo "usage: backup [once|schedule|retention|init]" >&2
		exit 2
		;;
esac
