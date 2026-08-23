# Application deployment and rollback

Production uses two blue/green application slots. After both slots have been
deployed at least once, each successful deployment keeps the previous slot's
image locally, records its deployment version under `.deploy/`, and removes
only its stopped container.

## Deploy

GitHub Actions normally invokes the deployment script with the commit SHA:

```bash
bash scripts/deploy-production.sh COMMIT_SHA
```

The script builds and health-checks the inactive slot, runs compatible
migrations, switches Caddy, verifies the public health endpoint, and then stops
the old slot.

## Roll back

After checking that applied migrations remain compatible with the previous
application, run:

```bash
bash scripts/deploy-production.sh rollback
```

The command starts the inactive slot with its retained image and recorded
deployment version, health-checks it, switches Caddy, verifies public health,
and stops the regressed slot. A failed rollback switches traffic back to the
current slot. Running the command again returns to the newer retained image.

This is a one-release application rollback, not a database rollback. It fails
closed if slot/version state or the retained image is missing. Use roll-forward
when a migration is incompatible; restoring a database backup can discard
writes made after that snapshot.

## Exercise

After changing the deployment script, deploy a known healthy revision, run the
rollback command, verify `/health`, and run the rollback command again to return
to the newer revision. Record the drill and both deployment versions in the
operations log.
