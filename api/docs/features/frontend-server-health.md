# Server Health Dashboard — frontend spec

Real-time **htop-style** monitoring for the API host machine. Superadmin-only.

The backend exposes:

- one REST snapshot for initial load / manual refresh
- one WebSocket stream for live updates every ~2 seconds

**Backend reference:** `api/mod/api/server_health/` (`router.py`, `response.py`, `helper.py`).

**Scope:** metrics come from the machine running the FastAPI process (uvicorn/Celery worker host). This is not remote DB/Redis monitoring.

---

## Access control

| Requirement | Detail |
| ----------- | ------ |
| Role | `superadmin` only |
| REST auth | `Authorization: Bearer <access_token>` |
| WebSocket auth | access token in query string (browsers cannot set custom headers on `WebSocket`) |

Non-superadmin callers receive `403` on REST. WebSocket closes with code `4403` (forbidden) or `4401` (unauthorized / invalid session).

Hide the nav entry and route unless the signed-in user has the superadmin role.

---

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/server-health/snapshot` | One-shot snapshot |
| `WS` / `WSS` | `/api/server-health/ws?token=<access_token>` | Live snapshot stream |

Use `wss:` when the app is served over HTTPS.

---

## 1. `GET /api/server-health/snapshot`

### Request

```http
GET /api/server-health/snapshot
Authorization: Bearer <access_token>
```

### Response `200`

Snake_case JSON. All `*_bytes` fields are integers. Percent fields are `0–100` floats.

```json
{
  "type": "snapshot",
  "collected_at": "2026-06-23T14:30:00.123456+05:30",
  "host": {
    "hostname": "api-prod-01",
    "platform": "Linux-6.12.10-x86_64-with-glibc2.39",
    "boot_time": "2026-06-20T08:00:00+05:30",
    "uptime_seconds": 280800
  },
  "cpu": {
    "percent": 23.5,
    "per_cpu_percent": [12.0, 45.0, 8.0, 30.0],
    "logical_cpu_count": 4
  },
  "memory": {
    "total_bytes": 17179869184,
    "used_bytes": 8589934592,
    "available_bytes": 7516192768,
    "percent": 50.0
  },
  "swap": {
    "total_bytes": 4294967296,
    "used_bytes": 0,
    "free_bytes": 4294967296,
    "percent": 0.0
  },
  "load_average": {
    "load_1m": 1.25,
    "load_5m": 0.98,
    "load_15m": 0.75
  },
  "disks": [
    {
      "mountpoint": "/",
      "device": "/dev/sda1",
      "fstype": "ext4",
      "total_bytes": 107374182400,
      "used_bytes": 53687091200,
      "free_bytes": 48318382080,
      "percent": 52.5
    }
  ],
  "processes": [
    {
      "pid": 1234,
      "name": "uvicorn",
      "username": "deploy",
      "cpu_percent": 18.5,
      "memory_percent": 4.2,
      "status": "running",
      "create_time": "2026-06-23T09:00:00+05:30"
    }
  ],
  "slow_processes": [
    {
      "pid": 5678,
      "name": "celery",
      "username": "deploy",
      "cpu_percent": 42.0,
      "memory_percent": 6.1,
      "status": "running",
      "create_time": "2026-06-23T08:30:00+05:30"
    }
  ]
}
```

### Field notes

| Field | Meaning |
| ----- | ------- |
| `processes` | Top 20 processes by CPU (descending) |
| `slow_processes` | Processes with CPU ≥ 5% **or** memory ≥ 5% (max 20) |
| `disks` | Local mountpoints only; sorted by `percent` desc |
| `collected_at` | Server timestamp when the sample was taken (IST DB timezone on host) |

### Errors

| Status | When |
| ------ | ---- |
| `401` | Missing/invalid token or revoked session |
| `403` | Not superadmin, or password change required (same as other `/api/*` routes) |

---

## 2. WebSocket `/api/server-health/ws`

### Connect

```typescript
const token = getAccessToken();
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const url = `${protocol}//${window.location.host}/api/server-health/ws?token=${encodeURIComponent(token)}`;
const socket = new WebSocket(url);
```

### Server → client messages

**Snapshot** (every ~2s by default): same JSON shape as the REST response. `type` is always `"snapshot"`.

**Pong** (reply to client ping):

```json
{ "type": "pong" }
```

### Client → server messages (optional)

Send as JSON text frames.

**Keepalive ping**

```json
{ "action": "ping" }
```

**Change poll interval** (server clamps to 1–10 seconds)

```json
{ "action": "set_interval", "seconds": 3 }
```

The server waits up to the current interval for a client message before sending the next snapshot. If the client sends nothing, snapshots still arrive on the timer.

### Disconnect / errors

| Close code | Meaning |
| ---------- | ------- |
| `4401` | Unauthorized (missing/invalid/expired token or session) |
| `4403` | Forbidden (valid session but not superadmin) |

On close, show a reconnect banner. Reconnect with exponential backoff (e.g. 1s → 2s → 5s, cap 30s). Refresh the token before reconnecting if the session may have rotated.

---

## Suggested UI

### Route

Example: `/admin/server-health` or under existing superadmin settings.

### Layout (htop-inspired)

```text
┌─────────────────────────────────────────────────────────────┐
│ Server Health          [Live ●]  hostname · uptime · refresh │
├─────────────────────────────────────────────────────────────┤
│ CPU 23.5%   [████████░░░░░░░░]   Load 1.25 / 5.98 / 0.75  │
│ RAM 50.0%   [██████████░░░░░░]   Swap 0.0%                  │
├─────────────────────────────────────────────────────────────┤
│ Disks                                                        │
│  /        52.5%  [██████████░░░░]  50 GB / 100 GB free      │
│  /data    81.0%  [████████████████░]  19 GB / 100 GB free   │
├──────────────────────────┬──────────────────────────────────┤
│ Top processes (CPU)      │ Slow / hot processes             │
│ PID  NAME      CPU%  MEM% │ PID  NAME      CPU%  MEM%  USER  │
│ 1234 uvicorn   18.5  4.2 │ 5678 celery    42.0  6.1  deploy │
└──────────────────────────┴──────────────────────────────────┘
```

### Recommended widgets

| Section | Source fields | UI hint |
| ------- | ------------- | ------- |
| Header | `host.hostname`, `host.uptime_seconds`, `collected_at` | Format uptime as `Xd Xh Xm`; show “last updated” from `collected_at` |
| CPU gauge | `cpu.percent`, `cpu.per_cpu_percent` | Overall bar + optional per-core spark bars |
| Memory | `memory.*` | Bar + `used / total` human-readable (GB) |
| Swap | `swap.*` | Hide section when `swap.total_bytes === 0` |
| Load | `load_average.*` | Show `1m / 5m / 15m`; warn when `load_1m > logical_cpu_count` |
| Disks | `disks[]` | Bar per `mountpoint`; warn when `percent >= 85` |
| Process tables | `processes`, `slow_processes` | Sortable table: PID, name, user, CPU%, MEM%, status |

### Live vs snapshot

| Pattern | Use |
| ------- | --- |
| Page mount | `GET /api/server-health/snapshot` for instant paint, then open WebSocket |
| While connected | Update state from each WS `snapshot` message |
| Manual refresh | Re-call REST or send `{ "action": "ping" }` and wait for next snapshot |
| Page unmount | `socket.close()` |

### Formatting helpers

```typescript
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean).join(" ");
}
```

---

## Suggested frontend files

| File | Role |
| ---- | ---- |
| `src/services/server-health-api.ts` | `fetchServerHealthSnapshot()`, WebSocket URL builder |
| `src/hooks/use-server-health-stream.ts` | Connect WS, merge snapshots into React state, reconnect logic |
| `src/pages/admin/server-health/page.tsx` | Dashboard page |
| `src/pages/admin/server-health/components/` | CPU/memory/disk/process cards |

### TypeScript types (mirror API)

```typescript
export type ServerHealthSnapshot = {
  type: "snapshot";
  collected_at: string;
  host: {
    hostname: string;
    platform: string;
    boot_time: string;
    uptime_seconds: number;
  };
  cpu: {
    percent: number;
    per_cpu_percent: number[];
    logical_cpu_count: number;
  };
  memory: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    percent: number;
  };
  swap: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent: number;
  };
  load_average: {
    load_1m: number;
    load_5m: number;
    load_15m: number;
  };
  disks: Array<{
    mountpoint: string;
    device: string;
    fstype: string;
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent: number;
  }>;
  processes: ServerProcessInfo[];
  slow_processes: ServerProcessInfo[];
};

export type ServerProcessInfo = {
  pid: number;
  name: string;
  username: string | null;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  create_time: string | null;
};
```

### REST client example

```typescript
export async function fetchServerHealthSnapshot(): Promise<ServerHealthSnapshot> {
  return customInstance<ServerHealthSnapshot>({
    url: "/api/server-health/snapshot",
    method: "GET",
  });
}
```

### WebSocket hook sketch

```typescript
export function useServerHealthStream(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ServerHealthSnapshot | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error" | "closed">("closed");

  useEffect(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) {
      setStatus("error");
      return;
    }

    setStatus("connecting");
    const socket = new WebSocket(buildServerHealthWebSocketUrl(token));

    socket.onopen = () => setStatus("live");
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "pong") return;
      if (payload.type === "snapshot") setSnapshot(payload);
    };
    socket.onerror = () => setStatus("error");
    socket.onclose = () => setStatus("closed");

    const pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "ping" }));
      }
    }, 30000);

    return () => {
      window.clearInterval(pingTimer);
      socket.close();
    };
  }, [enabled]);

  return { snapshot, status };
}
```

---

## OpenAPI / Orval

After backend deploy, regenerate the client:

1. Confirm `GET /api/server-health/snapshot` appears in `/api-spec` (superadmin token).
2. Run `pnpm api:sync` (or project equivalent).
3. Replace hand-written REST types with generated `ServerHealthSnapshot` if available.

WebSocket is **not** in OpenAPI — keep the manual hook and URL builder.

---

## Acceptance criteria

- [ ] Page visible only to superadmin users
- [ ] Initial data loads via `GET /api/server-health/snapshot`
- [ ] Live updates via WebSocket without full page reload
- [ ] CPU, memory, swap, load, and disk usage rendered with progress bars
- [ ] Top processes and slow processes shown in separate tables
- [ ] Connection status indicator (connecting / live / disconnected)
- [ ] Graceful handling of `401`/`403` on REST and WS close codes `4401`/`4403`
- [ ] WebSocket closed on page leave; no leaked connections
- [ ] Byte values and uptime formatted for human reading
- [ ] Disk and load warnings when usage is high

---

## Out of scope (v1)

- Historical charts / time-series storage
- Multi-host monitoring (DB, Redis, worker nodes)
- Process kill / server control actions
- Alerts or push notifications on thresholds
