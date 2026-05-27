# Whirlpool VPN Provisioner

A small Go service that **registers devices on a WireGuard VPN**, saves them in a database, and hands back a **client config file** or **QR code** so the device can connect.

Think of it like a **school ID office**: you sign up a student (device), they get a unique seat number (IP address), a key (WireGuard keys), and a printed pass (`.conf` / QR). If the pass is lost or stolen, you can **revoke** or **rotate** the key without changing their seat number.

---

## What problem does this solve? (PRD in one page)

| Need | What this service does |
|------|------------------------|
| Add a new phone/laptop to VPN | `POST /v1/devices` — creates record, assigns IP, adds peer on WireGuard |
| Download VPN settings | `GET /v1/devices/{uuid}/config` — returns WireGuard `.conf` text |
| Scan QR on phone | `GET /v1/devices/{uuid}/qr` — PNG QR of the full config |
| Remove access | `POST /v1/devices/{uuid}/revoke` — removes peer, marks device inactive |
| New keys, same IP | `POST /v1/devices/{uuid}/rotate` — new keypair, same assigned IP |
| See who is on VPN right now | `GET /v1/wireguard/peers` — live peers from WireGuard |
| Audit trail | Every important action is logged in SQLite (`audit_logs`) |

**Out of scope for MVP:** admin UI, SSO, encrypted private keys at rest, one-time QR links.

---

## How it works (simple picture)

```
Admin (curl / future UI)
        │
        ▼
   Go HTTP API  ──►  SQLite (devices + audit)
        │
        ▼
 WireGuard Backend  ──►  either Docker mock (dev) or host scripts (prod)
        │
        ▼
   wg0 on VPN server
```

### Create device — step by step

1. Admin sends name, email, device name.
2. Service picks the **next free IP** from `WG_DEVICE_START_IP` … `WG_DEVICE_END_IP`.
3. Service generates a **WireGuard key pair** (private + public).
4. Service asks the backend for the **server public key**.
5. Service tells WireGuard: “allow this public key at this IP.”
6. Service saves the device row in SQLite.
7. Service writes an audit log line.
8. Admin gets back a summary (UUID, IP, etc.) — **not** the private key in the list API.

Config and QR endpoints read the stored keys and build the client file when asked.

---

## Two run modes (dev vs production)

| | **Development (`WG_BACKEND=docker`)** | **Production (`WG_BACKEND=host`)** |
|---|--------------------------------------|-------------------------------------|
| Where WireGuard runs | Inside Docker container `whirlpool-wireguard-mock` | On the VPN server (`wg0`) |
| Host machine needs WireGuard? | **No** | Yes (already on VPN EC2) |
| How API talks to WireGuard | `docker exec … wg …` | Fixed scripts in `/usr/local/bin/vpn-*` via `sudo` |
| Why | Safe local testing without installing VPN tools | Locked-down production; API never runs raw `wg` commands |

The **same HTTP API** works in both modes. Only the backend behind the scenes changes.

---

## API layout

All JSON responses use:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```

When `APP_DEBUG=true`, errors may also include `"debug": { "cause": "...", "stack": "..." }`.

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Hello + **binary version** (stamped at build time) |
| `GET` | `/health` | Health check + **binary version** |

### Admin (`Authorization: Bearer <APP_ADMIN_API_KEY>`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/devices` | List all devices |
| `POST` | `/v1/devices` | Create / provision device |
| `GET` | `/v1/devices/{uuid}` | Get one device |
| `GET` | `/v1/devices/{uuid}/config` | WireGuard client config (plain text) |
| `GET` | `/v1/devices/{uuid}/qr` | QR PNG of config |
| `POST` | `/v1/devices/{uuid}/revoke` | Revoke device (keeps DB row, removes peer) |
| `POST` | `/v1/devices/{uuid}/rotate` | New keys, same IP |
| `GET` | `/v1/wireguard/peers` | Live peers from WireGuard backend |

### Example — create device

```bash
curl -X POST http://localhost:8080/v1/devices \
  -H "Authorization: Bearer change-this-local-key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Whirlpool User 01",
    "user_email": "user01@whirlpool.com",
    "device_name": "Android Phone",
    "device_type": "android"
  }'
```

---

## Code layout (functional arrangement)

Code is split into **layers**. Each layer has one job.

```
cmd/api/           → starts the program, wires everything together
internal/
  config/          → reads env + .env
  httpapi/           → router, auth middleware, JSON responses
  devices/           → HTTP handlers → service → repository (device CRUD + flows)
  wireguard/         → Backend interface + docker / host / fake implementations
  database/          → SQLite open + run migrations
  audit/             → audit log writes
  qr/                → PNG QR from config text
migrations/        → SQL schema (devices, audit_logs)
scripts/bin/       → production host wrapper scripts (vpn-add-peer, etc.)
docker/            → WireGuard mock for local dev
```

### Request path (example: create device)

```
HTTP POST /v1/devices
  → devices/handler.go      (decode JSON, call service)
  → devices/service.go      (validate, keys, IP, wg.AddPeer, repo.Create, audit)
  → devices/repository.go   (SQLite INSERT)
  → wireguard/docker_backend.go OR host_backend.go  (AddPeer)
  → JSON response
```

Handlers stay thin. Business rules live in **service**. SQL lives in **repository**. WireGuard commands live only in **wireguard** backends.

---

## Go features used (and why)

| Go feature | Where | Why we use it |
|------------|-------|----------------|
| **Packages** | `internal/devices`, `internal/wireguard`, … | Split code by responsibility; `internal/` means “only this app may import this.” |
| **Interfaces** | `wireguard.Backend` | Same device code works with Docker, host scripts, or fake test backend — swap without rewriting service logic. |
| **Structs + methods** | `Device`, `Service`, `Repository` | Group data and behavior; `func (s *Service) Create(...)` keeps related logic together. |
| **Error handling** | `if err != nil { return ..., err }` | Go has no exceptions; errors are values you check and return. |
| **`context.Context`** | Passed into service/repo calls | Standard way to carry deadlines/cancellation through the call chain. |
| **`database/sql`** | `repository.go` | Official Go database API; works with SQLite driver. |
| **`net/http` + chi router** | `httpapi/router.go` | Built-in HTTP server; chi adds clean route groups and middleware. |
| **Middleware** | `AdminAPIKeyAuth` | Reusable function that wraps handlers to check Bearer token before `/v1/*`. |
| **`exec.Command`** | docker/host backends | Run external commands safely with argument lists (no shell string拼接). |
| **`slog`** | `main.go` | Structured JSON logs (`version`, `addr`, `env`). |
| **Build tags / `-ldflags -X`** | `cmd/api/version.go` + `VERSION` file | Version is **burned into the binary** at compile time so you know exactly which build is running. |
| **Table-driven tests** | `host_backend_test.go` | Test parsers with input/output pairs — easy to read and extend. |
| **Blank import `_ "modernc.org/sqlite"`** | `main.go` | Registers SQLite driver as side effect without calling it directly. |

### The Backend interface (most important design choice)

```go
type Backend interface {
    AddPeer(publicKey, allowedIP string) error
    RemovePeer(publicKey string) error
    ShowPeers() ([]Peer, error)
    ServerPublicKey() (string, error)
}
```

`devices.Service` only knows this interface. It does **not** know about Docker or shell scripts. That is **dependency inversion** — the core app depends on an abstraction, not on Docker or Linux details.

---

## Data stored (SRS)

### `vpn_devices`

| Field | Meaning |
|-------|---------|
| `uuid` | Public ID for API URLs |
| `user_name`, `user_email`, `device_name`, `device_type` | Who / what |
| `assigned_ip` | VPN IP (unique) |
| `public_key` | WireGuard public key |
| `private_key_encrypted` | Private key (**plain text in MVP** — encrypt before real prod) |
| `is_active` | `false` after revoke |
| `revoked_at` | When revoked |

**IP pool size** = `(WG_DEVICE_END_IP - WG_DEVICE_START_IP) + 1`.  
Example: `10.44.0.11` → `10.44.3.254` = **1012** possible devices.  
Revoked devices still hold their IP in the DB today (IPs are not recycled automatically).

### `audit_logs`

Records actions like `device.create`, `device.revoke`, `device.rotate`, `device.config_download`.

---

## Configuration

Copy `.env.example` → `.env` for local dev.

| Variable | Meaning |
|----------|---------|
| `APP_ADMIN_API_KEY` | Bearer token for `/v1/*` |
| `APP_DEBUG` | If true, API errors include cause + stack trace |
| `WG_BACKEND` | `docker` (dev) \| `host` (prod) \| `fake` (tests) |
| `WG_DEVICE_START_IP` / `WG_DEVICE_END_IP` | IP allocation range |
| `WG_SERVER_ENDPOINT` | Client config: VPN server host:port |
| `WG_CLIENT_ALLOWED_IPS` | Client config: routes through VPN |

**Version is not from env.** Bump `VERSION` file and rebuild — version is embedded in the binary via `-ldflags "-X main.version=..."`.

---

## Build & run

### Local development

```bash
# 1. WireGuard mock (Docker only — host does NOT need WireGuard installed)
docker compose up --build wireguard-mock

# 2. API with hot reload
air

# Or without Air
go run ./cmd/api   # version shows as "dev" (unstamped)
```

### Release binary

```bash
# Edit VERSION, then:
./build-default.sh    # linux/amd64
./build-aarch.sh      # linux/arm64

curl http://localhost:8080/health
# confirms stamped version, e.g. "1.0.0"
```

### Production (summary)

1. Build binary on CI or build machine.
2. Deploy to `/opt/vpn-provisioner/vpn-provisioner`.
3. Env file: `/etc/vpn-provisioner/vpn-provisioner.env` (`WG_BACKEND=host`).
4. Install wrapper scripts to `/usr/local/bin/vpn-*`.
5. systemd unit: `scripts/systemctl/vpn-provisioner.service`.
6. Run as user `vpnapi` with sudo allowed only for those scripts.

See `docs/feature.md` for the full original spec and acceptance criteria.

---

## Project structure (quick map)

```
vpn-provisioner/
├── cmd/api/              # main entrypoint
├── internal/             # application code
├── migrations/           # SQLite schema
├── docker/               # WireGuard mock image
├── scripts/bin/          # prod wg wrapper scripts
├── scripts/systemctl/    # systemd unit
├── VERSION               # release version (stamped into binary)
├── build-default.sh      # amd64 build
├── build-aarch.sh        # arm64 build
├── docker-compose.yml    # local WireGuard mock
└── docs/feature.md       # detailed feature spec
```

---

## Security notes (read before prod)

- Private keys are stored **unencrypted** in MVP — add encryption before production.
- Use a strong `APP_ADMIN_API_KEY`; keep prod env file mode `640`.
- Host mode uses **fixed scripts only** — never give the API open `sudo wg`.
- Set `APP_DEBUG=false` in production unless actively troubleshooting.

---

## Related docs

- **`docs/feature.md`** — full PRD, acceptance criteria, production checklist
- **`.env.example`** — all environment variables
