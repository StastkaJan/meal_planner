# Production deployment

The production Compose overlay exposes its internal Caddy only on the external
Docker network `public-web`. The VPS's portfolio Caddy owns ports 80/443,
terminates TLS, and forwards the Meal Plan domain to `meal-plan-proxy:80` on
that network. PostgreSQL, Prometheus, Loki, and Alloy have no host ports.
Grafana binds to host loopback and is intended to be reached through an SSH
tunnel.

## First deployment

1. Point the domain's A/AAAA records at the host. Connect the existing VPS
   reverse proxy to the `public-web` Docker network and add the Meal Plan
   domain:

   ```caddyfile
   meals.example.com {
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
   `POSTGRES_PASSWORD`.
3. Apply migrations, start the first application slot, and start the shared
   services:

   ```bash
   bash scripts/deploy-production.sh initial
   ```

The command fails before deployment when a required database, backup, Grafana,
or domain value is absent. Keep `.env.production` out of source control
and store an encrypted copy in the team's secret manager. Never deploy with
`docker compose --profile production` alone: the base file intentionally keeps
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

The workflow supplies `meal.stastka.dev` as `DOMAIN`, overriding any stale
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

## Grafana access

Forward the loopback-only port, then open `http://localhost:3001`:

```bash
ssh -L 3001:127.0.0.1:3001 operator@production-host
```

Do not proxy Grafana publicly. Anonymous access and sign-up are disabled.

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
