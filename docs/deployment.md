# Application deployment and rollback

Production releases use registry image digests, never mutable tags. The deploy
script records the current and previous digests in `.deploy/images.env`; the
previous image stays addressable locally and in the registry.

## Deploy

Build and push the image in CI, copy its `IMAGE@sha256:DIGEST` reference, then
run on the host:

```sh
# CURRENT_APP_IMAGE is needed only when adopting the script for the first time.
CURRENT_APP_IMAGE=registry.example/meal-plan@sha256:1111111111111111111111111111111111111111111111111111111111111111 \
  ./scripts/deploy-image.sh deploy \
  registry.example/meal-plan@sha256:2222222222222222222222222222222222222222222222222222222222222222
```

Later deploys read the current digest from `.deploy/images.env`. The command
rejects tags, pulls the exact digest, replaces only `app`, and waits for its
Compose health check. Do not deploy a database change unless its migration has
an application rollback or roll-forward note.

## Roll back

If the new release is unhealthy or regresses production, run exactly:

```sh
./scripts/deploy-image.sh rollback
```

This pulls the recorded previous digest, replaces only `app`, waits for health,
and swaps current/previous so the action is reversible. Investigate first if a
schema change might be incompatible; this command rolls back application code,
not the database.

The lock at `.deploy/lock` prevents concurrent release commands. Remove that
empty directory only after confirming no deploy or rollback process is running.

## Exercise

Run the no-Docker state-transition smoke test after changing the script and as
part of an occasional release drill:

```sh
./scripts/deploy-image.test.sh
```

For a production drill, deploy a known healthy new digest, run the rollback
command, verify `/health`, then run the same rollback command again to restore
the newer release. Record the date and both digests in the operations log.
