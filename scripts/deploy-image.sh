#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
state_dir=${DEPLOY_STATE_DIR:-"$repo_dir/.deploy"}
state_file="$state_dir/images.env"
compose_file=${COMPOSE_FILE:-"$repo_dir/docker-compose.yml"}
lock_dir="$state_dir/lock"

usage() {
	printf 'Usage: %s deploy IMAGE@sha256:DIGEST | rollback\n' "$0" >&2
	exit 2
}

require_immutable() {
	case "$1" in
		*[!A-Za-z0-9._/@:-]*) invalid_image=1 ;;
		*) invalid_image=0 ;;
	esac
	if [ "$invalid_image" -eq 1 ] || ! printf '%s\n' "$1" | grep -Eq '^.+@sha256:[0-9a-fA-F]{64}$'; then
		printf 'Image must be an immutable sha256 digest: %s\n' "$1" >&2
		exit 2
	fi
}

read_state() {
	[ -f "$state_file" ] || return 1
	current_image=$(sed -n 's/^CURRENT_APP_IMAGE=//p' "$state_file")
	previous_image=$(sed -n 's/^PREVIOUS_APP_IMAGE=//p' "$state_file")
	[ -n "$current_image" ]
}

write_state() {
	umask 077
	tmp_file="$state_file.tmp.$$"
	printf 'CURRENT_APP_IMAGE=%s\nPREVIOUS_APP_IMAGE=%s\n' "$1" "$2" >"$tmp_file"
	mv "$tmp_file" "$state_file"
}

lock() {
	mkdir -p "$state_dir"
	if ! mkdir "$lock_dir" 2>/dev/null; then
		printf 'Another deployment command holds %s.\n' "$lock_dir" >&2
		exit 2
	fi
	trap 'rmdir "$lock_dir" 2>/dev/null || true' 0
	trap 'exit 130' HUP INT TERM
}

retain_image() {
	[ "${DRY_RUN:-0}" = 1 ] && return
	docker image inspect "$1" >/dev/null 2>&1 || docker pull "$1"
}

run_image() {
	image=$1
	if [ "${DRY_RUN:-0}" = 1 ]; then
		printf 'Would deploy %s\n' "$image"
		return
	fi
	docker pull "$image"
	APP_IMAGE="$image" docker compose -f "$compose_file" up -d --no-deps --wait app
}

action=${1:-}
case "$action" in
	deploy)
		[ "$#" -eq 2 ] || usage
		lock
		target_image=$2
		require_immutable "$target_image"
		if read_state; then
			require_immutable "$current_image"
		else
			current_image=${CURRENT_APP_IMAGE:-}
			[ -n "$current_image" ] || {
				printf 'First deploy requires CURRENT_APP_IMAGE with the running immutable image.\n' >&2
				exit 2
			}
			require_immutable "$current_image"
		fi
		[ "$target_image" != "$current_image" ] || {
			printf 'Target image is already current.\n' >&2
			exit 2
		}
		retain_image "$current_image"
		write_state "$target_image" "$current_image"
		if ! run_image "$target_image"; then
			printf 'Deployment failed. Restore the retained image with: %s rollback\n' "$0" >&2
			exit 1
		fi
		;;
	rollback)
		[ "$#" -eq 1 ] || usage
		lock
		read_state || {
			printf 'No deployment state found at %s.\n' "$state_file" >&2
			exit 2
		}
		[ -n "$previous_image" ] || {
			printf 'No previous image has been recorded.\n' >&2
			exit 2
		}
		require_immutable "$current_image"
		require_immutable "$previous_image"
		run_image "$previous_image"
		write_state "$previous_image" "$current_image"
		;;
	*) usage ;;
esac
