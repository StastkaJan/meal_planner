# Production deployment

The production Compose overlay exposes its internal Caddy only on the external
Docker network `public-web`. The VPS's portfolio Caddy owns ports 80/443,
terminates TLS, and forwards the Meal Plan domain to `meal-plan-proxy:80` on
that network. Prometheus, Loki, and Alloy have no host ports. PostgreSQL and
Grafana bind only to the private address configured by
`GRAFANA_BIND_ADDRESS`.

## First deployment

1. Point the domain's A/AAAA records at the host. Connect the existing VPS
   reverse proxy to the `public-web` Docker network and add the Meal Plan
   domain:

   ```caddyfile
   papuplan.cz {
     reverse_proxy meal-plan-proxy:80
   }
   ```

   Preserve the incoming `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`
   headers (the default in Caddy). The deployment script creates `public-web`
   when it is absent.

2. Put the checkout in `~/meal-plan`, copy `.env.production.example` to
   `.env.production`, replace every placeholder, and restrict the file to the
   deployment user (`chmod 600` on Linux). Generate URL-safe secrets with
   `openssl rand -hex 32`; the password embedded in `DATABASE_URL` must match
   `POSTGRES_PASSWORD`. Complete the [WireGuard runbook](wireguard.md) before
   deploying with its address as `GRAFANA_BIND_ADDRESS`; use `127.0.0.1` to
   retain SSH-tunnel access instead.
3. Apply migrations, start the first application slot, and start the shared
   services:

   ```bash
   bash scripts/deploy-production.sh initial
   ```

The command fails before deployment when a required database, backup, Grafana,
or domain value is absent. If the backup upload itself fails, an app-only
release may continue only when its migration files exactly match those bundled
in the active production image. First deployments and releases with migration
changes still fail closed. Keep `.env.production` out of source control and
store an encrypted copy in the team's secret manager. Never deploy with `docker
compose --profile production` alone: the base file intentionally keeps
local-development credentials and ports.

## Automated deployments

After the quality job passes on `main`, GitHub Actions uploads the tracked
source to `~/meal-plan` on the VPS and builds it there. Configure the GitHub
`production` environment with `VPS_HOST` and `VPS_USER` variables,
`VPS_SSH_KEY` secret, and `VPS_KNOWN_HOSTS` as either a variable or secret.
Generate the pinned host entry with `ssh-keyscan -H HOST`, verify its
fingerprint against the VPS console, and then save it; do not collect an
unverified key during the workflow. `VPS_SSH_KEY` should be a dedicated,
unencrypted private key for the deployment user.

The workflow supplies `papuplan.cz` as `DOMAIN`, overriding any stale
domain value in `.env.production` while leaving manual deployments compatible
with the env file.

The deployment script starts and health-checks the inactive blue/green app
slot, applies migrations, reloads the internal Caddy without dropping
connections, checks
the public `/health` endpoint, and only then removes the old slot. Application
deployments have no planned downtime. Migrations must remain compatible with
the currently running application until traffic has switched. Changes to
the host reverse proxy or shared infrastructure may still require a
maintenance deployment.

A backup failure that is bypassed for an app-only release remains an incident:
the scheduled backup and restore checks will continue alerting until the
repository is writable again. Starting or recreating the scheduler performs no
repository operations; the cron schedule takes a daily backup, verifies its
restore, and applies retention pruning weekly. Do not use email attachments as
the backup repository. To move providers, create a private S3-compatible bucket
and bucket-scoped credentials, then replace `RESTIC_REPOSITORY`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` in
`.env.production`; keep `RESTIC_PASSWORD` in a separate secret store.

For Backblaze B2, use the exact endpoint and region shown for the bucket. For
example, an EU Central bucket may use:

```dotenv
RESTIC_REPOSITORY=s3:https://s3.eu-central-003.backblazeb2.com/meal-planner/meal-plan
AWS_DEFAULT_REGION=eu-central-003
```

Use a bucket-scoped Read and Write application key with **List all bucket
names** enabled. The Backblaze key ID is `AWS_ACCESS_KEY_ID`; the application
key is `AWS_SECRET_ACCESS_KEY`. Initialize a new empty repository explicitly
with `compose run --rm backup init`. Normal backup failures never attempt to
initialize or overwrite a repository.

If Backblaze reports a daily Class B or Class C transaction cap, open **B2
Cloud Storage → Caps & Alerts → Edit Caps** and either raise the affected cap
or select **No Cap**. Cap changes can take several minutes; daily counters reset
at 00:00 UTC. A cap denial can appear as `Access Denied` through the
S3-compatible API and does not mean that the Restic repository is missing.

After at least two blue/green releases, the inactive slot retains the previous
application image. Follow [the rollback procedure](deployment.md) to switch back
without rebuilding. Check migration compatibility first; application rollback
does not revert the database.

## Grafana access

Use the [WireGuard access runbook](wireguard.md), then open
`http://10.77.0.1:3001`. Grafana uses a dedicated non-internal network so
Docker can publish the port to the VPN interface; metrics and logs remain on
the internal monitoring network.

For rollback or temporary access, set `GRAFANA_BIND_ADDRESS=127.0.0.1`,
recreate Grafana, and forward the loopback-only port:

```bash
ssh -N -L 3001:127.0.0.1:3001 SSH_USER@PRODUCTION_HOST
```

Do not proxy Grafana publicly. Anonymous access and sign-up are disabled.

## PostgreSQL access

With WireGuard active, connect a database client to `10.77.0.1:5432` using
the database name and credentials from `.env.production`. PostgreSQL binds to
the same private address as Grafana and must never use a public bind address.
With the SSH fallback (`GRAFANA_BIND_ADDRESS=127.0.0.1`), forward it instead:

```bash
ssh -N -L 5433:127.0.0.1:5432 SSH_USER@PRODUCTION_HOST
```

Then connect the client to `127.0.0.1:5433`.

## Secret rotation

Rotate credentials after operator access changes, suspected disclosure, and on
the schedule required by the credential issuer. Test `/health`, Grafana login,
and a Restic snapshot after each rotation before revoking the old credential.

- PostgreSQL: run `docker compose ... exec db psql -U mealplan -d mealplan` and
  use `\password mealplan` so the value does not enter shell history. Update
  both database values in `.env.production`, then recreate `app` and `backup`.
- Grafana: put the new value in a temporary shell variable, run
  `docker compose ... exec grafana grafana cli admin reset-admin-password
"$NEW_GRAFANA_PASSWORD"`, unset the variable, update the env file, and
  recreate Grafana.
- Restic: run `docker compose ... exec backup restic key add`, update the env
  file, recreate `backup`, verify a snapshot and restore, then remove the old
  key with `restic key remove`.
- Object storage and webhook credentials: issue replacements at the provider,
  update the env file, recreate `backup`, verify a snapshot/notification, then
  revoke the old credentials.

For rotation commands, replace `docker compose ...` with `docker compose
--env-file .env.production -f docker-compose.yml -f
docker-compose.production.yml --profile production`. Never type literal secrets
into shell history or commit the production env file.
