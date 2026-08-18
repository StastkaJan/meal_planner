#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
state_dir=$(mktemp -d)
trap 'rm -rf "$state_dir"' EXIT

old_image='registry.example/meal-plan@sha256:1111111111111111111111111111111111111111111111111111111111111111'
new_image='registry.example/meal-plan@sha256:2222222222222222222222222222222222222222222222222222222222222222'

DEPLOY_STATE_DIR="$state_dir" DRY_RUN=1 CURRENT_APP_IMAGE="$old_image" \
	"$script_dir/deploy-image.sh" deploy "$new_image"
grep -Fx "CURRENT_APP_IMAGE=$new_image" "$state_dir/images.env"
grep -Fx "PREVIOUS_APP_IMAGE=$old_image" "$state_dir/images.env"

DEPLOY_STATE_DIR="$state_dir" DRY_RUN=1 "$script_dir/deploy-image.sh" rollback
grep -Fx "CURRENT_APP_IMAGE=$old_image" "$state_dir/images.env"
grep -Fx "PREVIOUS_APP_IMAGE=$new_image" "$state_dir/images.env"

mkdir "$state_dir/lock"
if DEPLOY_STATE_DIR="$state_dir" DRY_RUN=1 "$script_dir/deploy-image.sh" rollback; then
	printf 'Concurrent rollback was accepted.\n' >&2
	exit 1
fi
rmdir "$state_dir/lock"

if DEPLOY_STATE_DIR="$state_dir" DRY_RUN=1 "$script_dir/deploy-image.sh" deploy registry.example/meal-plan:latest; then
	printf 'Mutable image tag was accepted.\n' >&2
	exit 1
fi

newline_image="$new_image
PREVIOUS_APP_IMAGE=registry.example/evil"
if DEPLOY_STATE_DIR="$state_dir" DRY_RUN=1 "$script_dir/deploy-image.sh" deploy "$newline_image"; then
	printf 'Unsafe image value was accepted.\n' >&2
	exit 1
fi

printf 'Deployment rollback smoke test passed.\n'
