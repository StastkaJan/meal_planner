# Production deployment

The production Compose overlay exposes only Caddy on ports 80/443. PostgreSQL,
Prometheus, Loki, and Alloy have no host ports. Grafana binds to host loopback
and is intended to be reached through an SSH tunnel.

## First deployment

1. Point the domain's A/AAAA records at the host and allow inbound TCP 80/443
   and UDP 443. Caddy obtains and renews the TLS certificate automatically.
2. Copy `.env.production.example` to `.env.production`, replace every
   placeholder, and restrict the file to the deployment user (`chmod 600` on
   Linux). Generate URL-safe secrets with `openssl rand -hex 32`; the password
   embedded in `DATABASE_URL` must match `POSTGRES_PASSWORD`.
3. Validate the stack, apply migrations once, then start it:

   ```bash
   docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.production.yml --profile production config --quiet
   docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.production.yml --profile production run --rm app node scripts-dist/migrate.js
   docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.production.yml --profile production up -d
   curl --fail --proto '=https' https://meals.example.com/health
   ```

The command fails before deployment when a required database, backup, Grafana,
domain, or ACME value is absent. Keep `.env.production` out of source control
and store an encrypted copy in the team's secret manager. Never deploy with
`docker compose --profile production` alone: the base file intentionally keeps
local-development credentials and ports.

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
