# WireGuard access

Grafana is available through WireGuard at `http://10.77.0.1:3001`, and
PostgreSQL at `10.77.0.1:5432`.
WireGuard keys are machine secrets: never put them in this repository or a
deployment environment file.

## Server

Install WireGuard on the Ubuntu VPS and create its key pair:

```bash
sudo apt update
sudo apt install wireguard
sudo -i
umask 077
wg genkey > /etc/wireguard/server.key
wg pubkey < /etc/wireguard/server.key > /etc/wireguard/server.pub
exit
```

Read the non-secret server public key:

```bash
sudo cat /etc/wireguard/server.pub
```

Create the Windows client configuration below and note its public key before
continuing.

Create `/etc/wireguard/wg0.conf` as root, substituting the server private key
and client public key:

```ini
[Interface]
Address = 10.77.0.1/24
ListenPort = 51820
PrivateKey = SERVER_PRIVATE_KEY

[Peer]
PublicKey = CLIENT_PUBLIC_KEY
AllowedIPs = 10.77.0.2/32
```

Read `SERVER_PRIVATE_KEY` from `/etc/wireguard/server.key`; do not print it in
shared terminals or logs. Allow inbound UDP 51820 in the VPS provider firewall
and, when UFW is active, the host firewall. Then start WireGuard:

```bash
sudo chmod 600 /etc/wireguard/wg0.conf
sudo ufw allow 51820/udp
sudo systemctl enable --now wg-quick@wg0
sudo wg show
```

IP forwarding and masquerading are not needed because the client accesses only
the VPS WireGuard address, not the internet or another private network through
the VPS.

## Windows client

Install the official WireGuard client, select **Add Tunnel > Add empty
tunnel**, and keep the generated private key on that device. Use:

```ini
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.77.0.2/32

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = PRODUCTION_HOST:51820
AllowedIPs = 10.77.0.1/32
PersistentKeepalive = 25
```

Copy the client public key displayed by the application into the server peer.
Copy `/etc/wireguard/server.pub` into the client peer. Activate the tunnel and
verify `http://10.77.0.1:3001/api/health` before opening Grafana. Database
clients can connect to `10.77.0.1:5432` using the production credentials.

Choose a different private subnet if `10.77.0.0/24` overlaps a client network.
Give every additional client its own key pair, address, and server `[Peer]`
entry.

## Deploy private service bindings

After `wg0` is active, set this in `.env.production`:

```dotenv
GRAFANA_BIND_ADDRESS=10.77.0.1
```

Run the normal production deployment or recreate Grafana and PostgreSQL with
the production Compose files. Verify that `docker compose ... ps` reports
`10.77.0.1:3001->3000/tcp` for Grafana and
`10.77.0.1:5432->5432/tcp` for PostgreSQL.

## Rollback

Keep WireGuard running until SSH fallback access is proven. Set
`GRAFANA_BIND_ADDRESS=127.0.0.1`, recreate Grafana, and verify the SSH tunnel in
the [production runbook](production.md). WireGuard can then be stopped without
deleting its keys:

```bash
sudo systemctl disable --now wg-quick@wg0
```
