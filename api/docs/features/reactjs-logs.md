# React frontend — Admin Console logs & segmented filter groups

You already have three sidebar pages (**Logs**, **Job Logs**, **Tasks**) with datatables, search, and pagination. This doc explains how to add a **segmented button group on each page** — same UX as **Logins** (`Login activity` | `IP summary`) — wired to the filter APIs so each type enriches the table below.

**Do not** merge Logs / Job Logs / Tasks into one page. Keep three sidebar routes; add one filter group per page.

Regenerate Orval after API updates.

---

## 1. Reference UI — copy from Logins page

On **Logins**, you already have:

```
Logins
Login activity, IP geolocation, and abuse investigation.

┌─────────────────────┬─────────────────────┐
│  Login activity     │  IP summary         │   ← segmented button group
└─────────────────────┴─────────────────────┘

[ search / filters / datatable … ]
```

Apply the **same component and placement** on:

| Sidebar route | Page title | Segmented group drives |
|---------------|------------|-------------------------|
| **Logs** | Logs | `source` filter (AUTH, EMAIL, …) |
| **Job Logs** | Job Logs | `job_name` filter |
| **Tasks** | Tasks | `task_type` filter |

Each group is loaded from its own filters API (see §3–§5). Reuse `<SegmentedButtons />` (or whatever Logins uses) — only `options` and `onChange` differ per page.

---

## 2. Target layout per page (Logs example)

Keep your existing **Level** column, search bar, date filters, and pagination. Insert the segmented group **between subtitle and search**:

```
Logs
Application and audit logs for the application.

┌──────┬──────┬───────┬─────────────┬──────────────┬ … ─┐
│ All  │ AUTH │ EMAIL │ USER ADD    │ USER ONBOARD │     │  ← NEW: from GET /api/logs/filters
└──────┴──────┴───────┴─────────────┴──────────────┴ … ─┘

[ Search … ]  [ Level ▾ ]  [ Date range … ]     ← keep existing toolbar

┌────────┬─────────────────────────┬────────┬──────────┐
│ Level  │ Message                 │ Source │ Time     │  ← enriched rows per tab
├────────┼─────────────────────────┼────────┼──────────┤
│ INFO   │ Email sent to user@…    │ EMAIL  │ …        │
└────────┴─────────────────────────┴────────┴──────────┘
[ Pagination ]
```

**Job Logs** — same shell; group labels from `job_names` (`auto approve inspections`, `task send email`, …).

**Tasks** — same shell; group labels from `task_types` (`send email`, `resolve ip metadata`, …).

---

## 3. One page = one filters API + one list API

### Shared types (Orval)

```ts
interface FilterOption {
  value: string; // query param value
  label: string; // segmented button label
}
```

### Shared hook pattern

```tsx
// hooks/useSegmentedLogFilters.ts
function useSegmentedLogFilters<T extends { value: string; label: string }[]>(
  fetchFilters: () => Promise<{ options: T }>,
  fetchList: (filterValue: string | null, page: number) => Promise<ListResponse>,
) {
  const [options, setOptions] = useState<FilterOption[]>([]);
  const [active, setActive] = useState<string | null>(null); // null = "All"
  const [page, setPage] = useState(1);
  // fetch filters on mount; refetch list when active or page changes
}
```

Prepend **All** client-side (`active = null` → omit filter query param).

---

## 4. Logs page — source filter group

### Step A — load segmented buttons

```
GET /api/logs/filters
```

```json
{
  "sources": [
    { "value": "AUTH", "label": "AUTH" },
    { "value": "EMAIL", "label": "EMAIL" },
    { "value": "USER_ADD", "label": "USER ADD" },
    { "value": "USER_ONBOARD", "label": "USER ONBOARD" },
    { "value": "USER_UPDATE", "label": "USER UPDATE" },
    { "value": "MASTER_UPDATE", "label": "MASTER UPDATE" },
    { "value": "INTEGRATION_KEY_UPDATED", "label": "INTEGRATION KEY UPDATED" }
  ]
}
```

Render: `[ All ]` + map `sources` → segmented buttons using **`label`**.

### Step B — load datatable

```
GET /api/logs?source=EMAIL&page=1&per_page=20
```

Omit `source` when **All** is selected. Keep existing `search`, `level`, date range, `sort_by`.

### Step C — enrich table per active tab

| Active tab | Extra columns / row actions |
|------------|----------------------------|
| **All** | Level, Message, Source, Time (current) |
| **AUTH** | + `details.attempted_email`, `details.ip`, login method |
| **EMAIL** | + `details.to_email`, `details.subject`; row click → drawer with `body_text` / `body_html` |
| **USER ONBOARD** | + `details.target_email`, `details.welcome_email_sent` |
| **USER ADD / UPDATE** | + `details.target_email`, `details.target_role` |

`details` is on every row — show relevant fields based on active `source` tab.

---

## 5. Job Logs page — job name filter group

### Step A — segmented buttons

```
GET /api/logs/job/filters
```

```json
{
  "job_names": [
    { "value": "auto_approve_inspections", "label": "auto approve inspections" },
    { "value": "resolve_pending_ip_metadata", "label": "resolve pending ip metadata" },
    { "value": "task:send_email", "label": "task send email" }
  ]
}
```

### Step B — datatable

```
GET /api/logs/job?job_name=auto_approve_inspections&page=1&per_page=20
```

Optional second row of chips: **All | Success | Failed** → `status=success|failed` (works with any job tab).

### Step C — enrich table

| Column | Always | Notes |
|--------|--------|-------|
| Job name | ✓ | Hidden or redundant when a single job tab is selected |
| Status | ✓ | success / failed badge |
| Rows updated | ✓ | |
| Message | ✓ | |
| Time | ✓ | |
| Metadata | expand | `metadata` JSON on row click |

---

## 6. Tasks page — task type filter group

### Step A — segmented buttons

```
GET /api/tasks/filters
```

```json
{
  "task_types": [
    { "value": "send_email", "label": "send email" },
    { "value": "notify_inspection_review_managers", "label": "inspection review notifications" },
    { "value": "resolve_ip_metadata", "label": "resolve ip metadata" },
    { "value": "generate_report", "label": "generate report" },
    { "value": "process_file", "label": "process file" },
    { "value": "send_webhook", "label": "send webhook" }
  ]
}
```

### Step B — datatable

```
GET /api/tasks?task_type=send_email&status=completed
```

Newest 50 rows (no pagination yet). Optional status chips under the group: queued, processing, completed, failed.

### Step C — enrich table

| Column | Notes |
|--------|-------|
| Task type | Redundant when one type tab selected — can hide |
| Status | Badge + colour |
| Progress | `progress_percent`, `progress_message` |
| Created by | e.g. `auth_change_password_otp`, `user_onboard` |
| Attempts | `attempts` / `max_attempts` |
| Error | `error_message` when failed |
| Time | `created_at` |

Row click → `GET /api/tasks/{uuid}` detail modal (`display_fields`).

---

## 7. API map

| Page (sidebar) | Filters API (segmented group) | List API (datatable) | Query param from tab |
|----------------|------------------------------|----------------------|----------------------|
| **Logs** | `GET /api/logs/filters` | `GET /api/logs` | `source` |
| **Job Logs** | `GET /api/logs/job/filters` | `GET /api/logs/job` | `job_name` |
| **Tasks** | `GET /api/tasks/filters` | `GET /api/tasks` | `task_type` |

Superadmin + Bearer token on all calls.

---

## 8. Implementation checklist

### Per page (Logs, Job Logs, Tasks)

- [ ] On mount → call filters API → build segmented group (`All` + API options).
- [ ] Reuse **Logins** segmented button component (icons optional).
- [ ] On segment change → reset page to 1 → refetch list with tab `value`.
- [ ] Do **not** hard-code segment labels — use API `label` / `value`.
- [ ] Keep existing search, Level filter (Logs), pagination (Logs + Job Logs).

### Logs only

- [ ] Row detail drawer for **EMAIL** tab (`details.body_text`, `body_html`).
- [ ] Show `details` fields relevant to active source tab.

### Job Logs only

- [ ] Optional Success / Failed chips → `status` param.

### Tasks only

- [ ] Optional status chips → `status` param.
- [ ] Task detail from `GET /api/tasks/{uuid}`.

### UX

- [ ] Loading skeleton on segment change.
- [ ] Empty state: “No EMAIL logs in this date range.”
- [ ] URL sync optional: `/admin/logs?source=EMAIL`

---

## 9. Component reuse

Extract from Logins page:

```tsx
<PageHeader title="Logs" subtitle="Application and audit logs for the application." />

<SegmentedFilterGroup
  options={[{ value: null, label: "All" }, ...sources]}
  value={activeSource}
  onChange={(v) => { setActiveSource(v); setPage(1); }}
/>

<LogsToolbar search={…} level={…} dateRange={…} />   {/* existing */}
<DataTable columns={columnsForActiveTab} rows={data} />
<Pagination … />
```

Use the same `SegmentedFilterGroup` on Job Logs (`job_names`) and Tasks (`task_types`).

---

## 10. Related pages (no change)

| Sidebar | Segmented group | Notes |
|---------|-----------------|-------|
| **Logins** | Login activity \| IP summary | Already done — use as visual reference |
| **Logs** | Source types | This doc §4 |
| **Job Logs** | Job names | §5 |
| **Tasks** | Task types | §6 |

Logins uses `GET /api/logins` and `GET /api/logins/ip-summary` — separate from audit **Logs** (`GET /api/logs`).
