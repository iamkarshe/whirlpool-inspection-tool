# Feature: Whirlpool WireGuard Device Provisioning Service

## Objective

Build a mature Go-based VPN device provisioning service for Whirlpool PDI.

The service must provision one WireGuard configuration per device, generate client `.conf` files and QR codes, assign unique VPN IPs, store device records in SQLite, and add/remove peers from a disposable Docker-based WireGuard mock during development.

The host development machine must not require WireGuard, dnsmasq, iptables, or VPN services installed locally.

## Development Architecture

```txt
Developer laptop / dev server
  - Go API server
  - SQLite database
  - QR/config generation
  - Device CRUD
  - Audit logging
  - No WireGuard installed locally

Docker container
  - WireGuard mock only
  - wg0 interface
  - wireguard-tools
  - test peer add/remove/show operations
```

The Go API must communicate with the Docker WireGuard mock through a backend abstraction.

## Technology Stack

Use the following stack:

- Language: Go
- Router: chi
- Database: SQLite
- SQLite driver: modernc.org/sqlite
- Logging: slog
- Validation: go-playground/validator
- UUID: github.com/google/uuid
- Hot reload: Air
- Testing: Go standard testing package, httptest, table-driven tests
- Docker: WireGuard mock only
- QR generation: pure Go QR library preferred, qrencode fallback allowed

Use Go because this service is an infra-control service with low memory requirements, strong typing needs, simple deployment, OS command integration, and long-term maintainability.

## Important Development Rule

Do not install WireGuard on the host system.

WireGuard must run only inside Docker for local development.

The Go API must run directly on the host using:

```bash
air
```

or:

```bash
go run ./cmd/api
```

## Required Project Structure

Create the project using this structure:

```txt
vpn-provisioner/
  cmd/
    api/
      main.go

  internal/
    config/
      config.go

    httpapi/
      router.go
      middleware.go
      response.go

    devices/
      handler.go
      service.go
      repository.go
      model.go

    wireguard/
      backend.go
      docker_backend.go
      host_backend.go
      fake_backend.go
      keys.go
      config_template.go

    database/
      database.go
      migrations.go

    audit/
      model.go
      repository.go
      service.go

    qr/
      service.go

  docker/
    wireguard-mock/
      Dockerfile
      entrypoint.sh

  migrations/
    001_create_devices.sql
    002_create_audit_logs.sql

  data/
    .gitkeep

  wireguard-mock-data/
    .gitkeep

  .air.toml
  .env.example
  docker-compose.yml
  go.mod
  README.md
```

## Go Module Setup

Initialize the module:

```bash
go mod init github.com/scoptanalytics/whirlpool-vpn-provisioner
```

Install dependencies:

```bash
go get github.com/go-chi/chi/v5
go get github.com/google/uuid
go get github.com/go-playground/validator/v10
go get modernc.org/sqlite
```

Optional pure Go QR library:

```bash
go get github.com/skip2/go-qrcode
```

## Hot Reload Tool

Use Air for hot reload.

Install:

```bash
go install github.com/air-verse/air@latest
```

Run:

```bash
air
```

Air should rebuild and restart the Go API when source files change.

## .air.toml

Create `.air.toml`:

```toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/vpn-provisioner ./cmd/api"
bin = "./tmp/vpn-provisioner"
include_ext = ["go", "tpl", "tmpl", "html"]
exclude_dir = ["data", "tmp", "vendor", "wireguard-mock-data"]
delay = 1000
stop_on_error = true

[log]
time = true

[misc]
clean_on_exit = true
```

## Environment Configuration

Create `.env.example`:

```env
APP_ENV=local
APP_ADDR=:8080
APP_DB_PATH=./data/vpn_provisioner.sqlite
APP_ADMIN_API_KEY=LOCAL_KEY

WG_BACKEND=docker
WG_DOCKER_CONTAINER=whirlpool-wireguard-mock
WG_INTERFACE=wg0
WG_SERVER_ENDPOINT=whirlpool-pdi-vpn.scoptanalytics.in:51820
WG_SERVER_VPN_IP=10.44.0.1
WG_CLIENT_DNS=10.44.0.1
WG_CLIENT_ALLOWED_IPS=10.20.0.0/16, 10.44.0.0/24
WG_DEVICE_START_IP=10.44.0.11
WG_DEVICE_END_IP=10.44.0.200
```

The app should load configuration from environment variables.

For local development, support `.env` loading only if implemented cleanly. Otherwise use shell exports or `direnv`.

## Docker Compose

Create `docker-compose.yml`:

```yaml
services:
  wireguard-mock:
    build:
      context: ./docker/wireguard-mock
      dockerfile: Dockerfile
    container_name: whirlpool-wireguard-mock
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    devices:
      - /dev/net/tun:/dev/net/tun
    environment:
      WG_INTERFACE: wg0
      WG_SERVER_IP: 10.44.0.1
      WG_LISTEN_PORT: 51820
    ports:
      - "51820:51820/udp"
    volumes:
      - ./wireguard-mock-data:/etc/wireguard
```

## Dockerfile for WireGuard Mock

Create `docker/wireguard-mock/Dockerfile`:

```dockerfile
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV WG_INTERFACE=wg0
ENV WG_SERVER_IP=10.44.0.1
ENV WG_LISTEN_PORT=51820

RUN apt-get update && apt-get install -y --no-install-recommends \
    wireguard-tools \
    iproute2 \
    iptables \
    iputils-ping \
    dnsutils \
    qrencode \
    bash \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

## WireGuard Mock Entrypoint

Create `docker/wireguard-mock/entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p /etc/wireguard

if [ ! -f /etc/wireguard/server_private.key ]; then
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
  chmod 600 /etc/wireguard/server_private.key
fi

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  ip link add "$WG_INTERFACE" type wireguard
  ip address add "$WG_SERVER_IP/24" dev "$WG_INTERFACE"
  wg set "$WG_INTERFACE" private-key /etc/wireguard/server_private.key listen-port "$WG_LISTEN_PORT"
  ip link set "$WG_INTERFACE" up
fi

echo "WireGuard mock is running."
echo "Interface: $WG_INTERFACE"
echo "Server IP: $WG_SERVER_IP"
echo "Server public key:"
cat /etc/wireguard/server_public.key

tail -f /dev/null
```

## WireGuard Backend Interface

Create a backend abstraction.

```go
package wireguard

type Peer struct {
	PublicKey string `json:"public_key"`
	AllowedIP string `json:"allowed_ip"`
}

type Backend interface {
	AddPeer(publicKey string, allowedIP string) error
	RemovePeer(publicKey string) error
	ShowPeers() ([]Peer, error)
	ServerPublicKey() (string, error)
}
```

Implement three backends:

```txt
DockerBackend
  Used during local development.
  Calls docker exec whirlpool-wireguard-mock wg ...

HostBackend
  Used in production.
  Calls restricted wrapper scripts such as /usr/local/bin/vpn-add-peer.

FakeBackend
  Used for unit tests.
  Does not call Docker or host commands.
```

## DockerBackend Behavior

The Docker backend should run commands like:

```bash
docker exec whirlpool-wireguard-mock wg show wg0
docker exec whirlpool-wireguard-mock wg set wg0 peer <public_key> allowed-ips <ip>/32
docker exec whirlpool-wireguard-mock wg set wg0 peer <public_key> remove
docker exec whirlpool-wireguard-mock cat /etc/wireguard/server_public.key
```

Do not use shell string concatenation.

Use `exec.Command` with argument arrays.

## HostBackend Production Behavior

The HostBackend must not run arbitrary shell commands.

It should only call controlled scripts:

```txt
/usr/local/bin/vpn-add-peer
/usr/local/bin/vpn-remove-peer
/usr/local/bin/vpn-show-peers
/usr/local/bin/vpn-server-public-key
```

Production scripts will be granted limited sudo permission later.

## Device Model

Create a device model with these fields:

```go
type Device struct {
	ID                    int64
	UUID                  string
	UserName              string
	UserEmail             string
	DeviceName            string
	DeviceType            string
	AssignedIP            string
	PublicKey             string
	PrivateKeyEncrypted   string
	IsActive              bool
	CreatedAt             time.Time
	UpdatedAt             time.Time
	RevokedAt             *time.Time
	LastConfigDownloadedAt *time.Time
}
```

For local MVP, private key may be stored as plain text or a base64 field if encryption is not implemented yet.

Add a clear TODO to encrypt private keys before production.

## SQLite Schema

Create `migrations/001_create_devices.sql`:

```sql
CREATE TABLE IF NOT EXISTS vpn_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT,
    assigned_ip TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    revoked_at DATETIME,
    last_config_downloaded_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_vpn_devices_user_email ON vpn_devices(user_email);
CREATE INDEX IF NOT EXISTS idx_vpn_devices_is_active ON vpn_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_vpn_devices_assigned_ip ON vpn_devices(assigned_ip);
```

Create `migrations/002_create_audit_logs.sql`:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    action TEXT NOT NULL,
    actor TEXT,
    device_uuid TEXT,
    metadata TEXT,
    created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_device_uuid ON audit_logs(device_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
```

## API Endpoints

Implement these endpoints:

```txt
GET    /health
GET    /v1/devices
POST   /v1/devices
GET    /v1/devices/{uuid}
GET    /v1/devices/{uuid}/config
GET    /v1/devices/{uuid}/qr
POST   /v1/devices/{uuid}/revoke
POST   /v1/devices/{uuid}/rotate
GET    /v1/wireguard/peers
```

## Authentication

For MVP, use admin API key auth.

Every `/v1/*` route must require:

```http
Authorization: Bearer <APP_ADMIN_API_KEY>
```

`/health` should not require auth.

If auth fails, return:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

Use HTTP 401.

## Create Device Flow

When `POST /v1/devices` is called:

1. Validate request body.
2. Assign next available IP from configured range.
3. Generate WireGuard private key.
4. Generate WireGuard public key from private key.
5. Ask backend for server public key.
6. Add peer to WireGuard backend.
7. Store device in SQLite.
8. Write audit log.
9. Return device summary.

Request:

```json
{
  "user_name": "Whirlpool User 01",
  "user_email": "user01@whirlpool.com",
  "device_name": "Android Phone",
  "device_type": "android"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "uuid": "generated-uuid",
    "user_name": "Whirlpool User 01",
    "user_email": "user01@whirlpool.com",
    "device_name": "Android Phone",
    "device_type": "android",
    "assigned_ip": "10.44.0.11",
    "is_active": true
  }
}
```

## Client Config Template

Generate this config:

```ini
[Interface]
PrivateKey = {{DEVICE_PRIVATE_KEY}}
Address = {{DEVICE_IP}}/32
DNS = {{WG_CLIENT_DNS}}

[Peer]
PublicKey = {{SERVER_PUBLIC_KEY}}
Endpoint = {{WG_SERVER_ENDPOINT}}
AllowedIPs = {{WG_CLIENT_ALLOWED_IPS}}
PersistentKeepalive = 25
```

For Whirlpool PDI local values:

```ini
[Interface]
PrivateKey = DEVICE_PRIVATE_KEY
Address = 10.44.0.11/32
DNS = 10.44.0.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = whirlpool-pdi-vpn.scoptanalytics.in:51820
AllowedIPs = 10.20.0.0/16, 10.44.0.0/24
PersistentKeepalive = 25
```

## Revoke Device Flow

When `POST /v1/devices/{uuid}/revoke` is called:

1. Find device by UUID.
2. If already inactive, return success with current state.
3. Remove peer using WireGuard backend.
4. Mark device inactive.
5. Set revoked_at.
6. Write audit log.
7. Return updated device summary.

## Rotate Device Flow

When `POST /v1/devices/{uuid}/rotate` is called:

1. Find active device.
2. Remove old peer.
3. Generate new private/public keypair.
4. Add new peer with same assigned IP.
5. Update stored keys.
6. Write audit log.
7. Return updated config or QR.

## QR Flow

`GET /v1/devices/{uuid}/qr` should return PNG.

The QR content must be the full WireGuard client config.

Use a pure Go QR library if possible.

If using command line `qrencode`, hide it behind a service abstraction.

## Response Format

All JSON APIs should follow:

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": "Human readable error"
}
```

## Testing Requirements

Use Go’s standard test tooling.

Run:

```bash
go test ./...
```

Use these test types:

### Unit Tests

Use FakeBackend for:

- IP allocation
- Device creation
- Device revoke
- Device rotation
- Config rendering
- Validation failure
- Duplicate email/device cases if implemented

### HTTP Handler Tests

Use `httptest` for:

- `GET /health`
- Unauthorized `/v1/devices`
- Authorized device creation
- Invalid payload
- Device revoke
- WireGuard peers endpoint

### Integration Tests

Optional but recommended:

- Start Docker mock.
- Run API.
- Create device.
- Verify `docker exec whirlpool-wireguard-mock wg show` contains peer.
- Revoke device.
- Verify peer is removed.

## Development Commands

Start WireGuard mock:

```bash
docker compose up --build wireguard-mock
```

Run Go API with hot reload:

```bash
air
```

Run Go API without hot reload:

```bash
go run ./cmd/api
```

Run tests:

```bash
go test ./...
```

Format code:

```bash
gofmt -w .
```

Vet code:

```bash
go vet ./...
```

Check WireGuard mock:

```bash
docker exec -it whirlpool-wireguard-mock wg show
```

## Manual API Testing

Health:

```bash
curl http://localhost:8080/health
```

Create device:

```bash
curl -X POST http://localhost:8080/v1/devices \
  -H "Authorization: Bearer [LOCAL_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Whirlpool User 01",
    "user_email": "user01@whirlpool.com",
    "device_name": "Android Phone",
    "device_type": "android"
  }'
```

List devices:

```bash
curl http://localhost:8080/v1/devices \
  -H "Authorization: Bearer [LOCAL_KEY]"
```

Check mock peers:

```bash
docker exec -it whirlpool-wireguard-mock wg show
```

## Acceptance Criteria

The feature is complete when:

1. Go API runs locally without WireGuard installed on host.
2. Docker mock starts a working `wg0` interface.
3. `POST /v1/devices` creates a device, assigns IP, generates keys, adds peer to Docker mock, and stores record in SQLite.
4. `GET /v1/devices/{uuid}/config` returns a valid WireGuard client config.
5. `GET /v1/devices/{uuid}/qr` returns a QR PNG.
6. `POST /v1/devices/{uuid}/revoke` removes peer from Docker mock and marks device inactive.
7. `GET /v1/wireguard/peers` shows active peers from mock.
8. Tests pass with `go test ./...`.
9. Code uses clean interfaces and does not hardcode Docker logic inside business services.
10. Host machine remains clean from WireGuard installation.

## Production Notes

In production, the service will run on the VPN EC2 as a systemd service.

WireGuard will run on the host, not in Docker.

Replace DockerBackend with HostBackend.

HostBackend must use restricted sudo wrapper scripts only.

Do not give the API process unrestricted root access.

Production SQLite path should be:

```txt
/var/lib/vpn-provisioner/vpn.sqlite
```

Production logs should go to:

```txt
/var/log/vpn-provisioner/
```

Before production, implement:

- Private key encryption
- Admin user login or SSO
- Audit log viewer
- Backup process for SQLite
- One-time QR/config access policy
- Rate limiting
- TLS termination

## Production Host Wrapper Scripts

Production should use restricted wrapper scripts instead of direct `wg` command execution from the API.

Example add peer script:

```bash
#!/usr/bin/env bash
set -euo pipefail

PUBLIC_KEY="$1"
ALLOWED_IP="$2"

wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$ALLOWED_IP/32"
wg-quick save wg0
```

Example remove peer script:

```bash
#!/usr/bin/env bash
set -euo pipefail

PUBLIC_KEY="$1"

wg set wg0 peer "$PUBLIC_KEY" remove
wg-quick save wg0
```

The production service user should receive sudo permission only for these wrapper scripts.

Do not grant broad sudo access to the API process.

## Future Enhancements

After MVP:

- Admin web UI
- Device owner mapping
- One-time QR view
- Config download expiry
- Encrypted private key storage
- SSO login
- MFA for admins
- Audit log dashboard
- SQLite backup command
- Device import/export
- Per-device notes
- Last handshake visibility from `wg show`
- Device status page
- Multi-VPN-server support if required later
