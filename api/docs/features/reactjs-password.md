# React frontend — password, onboarding, and admin logs

Implementation guide for the Whirlpool PDI React app (desktop + PWA). Regenerate Orval clients after pulling latest API OpenAPI.

---

## 1. Overview — four password flows

| Flow | Who | Route (UI) | API |
|------|-----|------------|-----|
| **Admin create + onboard** | Superadmin | Admin → Users | `POST /api/users` then `POST /api/users/{uuid}/onboard` |
| **First login / forced change** | New or expired user | `/change-password` (blocking) | `POST /auth/change-password` |
| **Account change (logged in)** | Any non-superadmin user | Settings → Security (desktop + PWA) | OTP + `POST /auth/change-password` |
| **Forgot password (public)** | User not logged in | `/forgot-password`, `/reset-password` | `POST /auth/forgot-password`, `POST /auth/reset-password` |

VPN provisioning is **separate** from onboarding email (`POST /api/users/generate-vpn`).

---

## 2. Login response — route guards

After `POST /auth/login` or `POST /auth/login-token`, read these flags **before** entering the app:

```ts
interface LoginResponse {
  access_token: string;
  must_change_password: boolean;
  password_expired: boolean;
  change_password_otp_required: boolean;
  requires_device_selection: boolean;
  // ...
}
```

### Guard order (recommended)

```
login success
  → if must_change_password || password_expired
       → redirect /change-password (skip device selection for now)
  → else if requires_device_selection
       → device picker flow
  → else
       → main app
```

### API lockout until password is current

Any authenticated `/api/*` or `/auth/devices/*` call returns **403**:

```json
{ "detail": "Password change required before using the application." }
```

**Only exempt route:** `POST /auth/change-password` and `POST /auth/change-password/request-otp`.

Handle 403 globally: if message matches above → redirect to `/change-password`.

**Superadmin** is never blocked by password policy (`must_change_password` / `password_expired` are always false for them).

---

## 3. Admin panel — user onboarding (Superadmin)

Two-step flow. **Do not** expect welcome email from user create alone.

### Step 1 — Create user

```
POST /api/users
Authorization: Bearer <superadmin token>
```

Body includes `password` (admin-chosen initial password; overwritten on onboard), `email`, `role`, scopes, etc.

Email must match server whitelist (`REGISTRATION_EMAIL_DOMAIN_WHITELIST`, default `*.whirlpool.in`).

Save `uuid` from response.

### Step 2 — Send onboarding email

```
POST /api/users/{user_uuid}/onboard
```

No body. Server:

- Generates a new **temporary password**
- Sets `must_change_password: true`
- Sends welcome email (login URL + temp credentials)
- Safe to call again to **resend** (invalidates previous temp password)

Response:

```json
{
  "user": { ... },
  "welcome_email_sent": true
}
```

`welcome_email_sent: true` means queued or sent — not guaranteed inbox delivery. Superadmin can verify under **Logs → EMAIL** (see §8).

### Admin UI suggestions

- After create: show **“Send onboarding email”** button → calls onboard.
- Show onboard status badge: “Pending onboard” / “Onboard email sent”.
- Resend onboarding: call onboard again (confirm dialog — resets password).
- VPN: separate action → `POST /api/users/generate-vpn`.

---

## 4. End user — first login after onboard

1. User opens link from email (`FRONTEND_BASE_URL/login`).
2. Login with **temporary password** from email.
3. `must_change_password: true` → redirect to `/change-password`.
4. Submit new password via `POST /auth/change-password`:

```json
{
  "current_password": "<temp from email>",
  "new_password": "...",
  "confirm_password": "..."
}
```

No OTP on first login unless backend sets `CHANGE_PASSWORD_ONBOARDING_OTP_REQUIRED=true` (default **false**).

5. On success → clear guard → continue to app (device selection if needed).

---

## 5. Account change password (desktop + PWA)

Same screen and API for desktop browser and PWA. Entry points:

- Settings / Account → **Change password**
- Forced redirect when `password_expired: true`

### When OTP is required

After onboarding (`must_change_password: false`), login returns `change_password_otp_required: true` when `CHANGE_PASSWORD_OTP_REQUIRED=true` (default).

**Flow:**

1. User opens change-password form.
2. If `change_password_otp_required` (from login or a lightweight session store):
   - Show **“Send verification code”** → `POST /auth/change-password/request-otp`
   - Display `expires_in_minutes` countdown.
3. User fills: current password, new password, confirm, **OTP code**.
4. `POST /auth/change-password`:

```json
{
  "current_password": "...",
  "new_password": "...",
  "confirm_password": "...",
  "otp_code": "123456"
}
```

`otp_code` omit when `change_password_otp_required` is false.

### Request OTP response

```json
{
  "message": "Verification code sent to your email",
  "otp_required": true,
  "expires_in_minutes": 10,
  "debug": { "otp_required": true, "email_sent": true }
}
```

`debug` only when `APP_ENV=dev`.

If `otp_required: false` → skip OTP UI (first-login path).

### Errors

| Status | Meaning |
|--------|---------|
| 401 | Wrong current password or invalid/expired OTP |
| 422 | Weak password, mismatch, reuse of last 3 passwords, missing OTP |
| 429 | Too many OTP requests |
| 503 | Email could not be sent |

---

## 6. Forgot / reset password (public, not logged in)

No OTP — magic link is the email proof.

### Forgot

```
POST /auth/forgot-password
{ "email": "user@whirlpool.in" }
```

Always show generic success copy (anti-enumeration). In dev, `debug.email_sent` / `debug.is_disallowed` may be present.

**Superadmin** cannot use forgot-password.

### Reset

User lands on `/reset-password?token=...` from email.

```
POST /auth/reset-password
{
  "token": "<from query>",
  "password": "...",
  "confirm_password": "..."
}
```

On success all sessions are revoked — redirect to login.

Rate limiting: `429` with `Retry-After` header on too many auth attempts from same IP.

---

## 7. zxcvbn — client-side strength UI

Install (you handle this):

```bash
pnpm add zxcvbn @types/zxcvbn
```

Server requires **score ≥ 3** (`PASSWORD_STRENGTH_MIN_SCORE`). Mirror that client-side for instant feedback before submit.

### Recommended component behaviour

```ts
import zxcvbn from "zxcvbn";

const result = zxcvbn(newPassword, [
  email,
  name,
  mobileNumber,
].filter(Boolean));

// result.score: 0–4 — require >= 3 before enabling Submit
// result.feedback.warning — show as alert
// result.feedback.suggestions — bullet list
// result.crack_times_display — optional “time to crack” hint
```

### Visual layer (suggested)

- **Strength meter** (5 segments or bar): map score 0–4 to colours (red → green).
- **Warning** line from `feedback.warning` (e.g. “This is a top-10 common password”).
- **Suggestions** list from `feedback.suggestions`.
- Disable submit until `score >= 3` and passwords match.
- Re-validate on blur and on every keystroke (debounced ~200ms).

### Server errors to map in UI

Server returns `422` with `detail` string. Map known messages:

| API `detail` | UI copy |
|--------------|---------|
| `Password is too weak` / zxcvbn warning text | Show under strength meter (same as client warning) |
| `Password cannot match your current or last 3 passwords` | Highlight new password field — “Cannot reuse recent passwords” |
| `New password must be different from your current password` | Inline error |
| `Password and confirm password do not match` | Confirm field error |
| `Email verification code is required` | Prompt to request OTP |
| `Invalid or expired verification code` | OTP field error + offer resend |

Client-side zxcvbn reduces round-trips; **server always wins** on submit.

---

## 8. Admin Console — Logs (Superadmin)

Three tabs. Each tab: **filter tabs API** + **paginated list API**.

### 8.1 Application logs

| Purpose | Endpoint |
|---------|----------|
| Segmented source tabs | `GET /api/logs/filters` → `{ sources: [{ value, label }] }` |
| List | `GET /api/logs?source=EMAIL&page=1&per_page=20` |

Sources include: `AUTH`, `USER ADD`, `USER ONBOARD`, `USER UPDATE`, `MASTER UPDATE`, `INTEGRATION KEY UPDATED`, `EMAIL`.

Optional: `level=info|warn|error`, `search`, date range (`date_field`, `date_from`, `date_to`), `sort_by`, `sort_dir`.

List item shape:

```ts
{
  id, uuid, level, message, source, created_at,
  details?: Record<string, unknown>  // full audit payload
}
```

**Email debugging:** filter `source=EMAIL`. In row detail drawer show:

- `details.to_email`, `details.from_email`, `details.subject`
- `details.body_text` / `details.body_html` (preview tab)
- `details.email_kind` (`welcome_onboarding`, `password_reset`, `change_password_otp`, …)
- `details.delivery_mode` (`direct` | `celery`)

### 8.2 Job logs

| Purpose | Endpoint |
|---------|----------|
| Segmented job tabs | `GET /api/logs/job/filters` → `{ job_names: [{ value, label }] }` |
| List | `GET /api/logs/job?job_name=auto_approve_inspections&status=failed` |

### 8.3 Background tasks

| Purpose | Endpoint |
|---------|----------|
| Segmented task type tabs | `GET /api/tasks/filters` → `{ task_types: [{ value, label }] }` |
| List | `GET /api/tasks?task_type=send_email&status=completed` |

Task list returns newest **50** rows (no pagination yet).

### 8.4 Password reset audit (optional admin view)

```
GET /api/password-reset-requests
```

Paginated forgot-password / reset audit for Superadmin.

---

## 9. Shared React patterns

### 9.1 Single `ChangePasswordPage` component

Props / mode:

- `mode: "forced" | "voluntary"` — copy differs; forced blocks back navigation.
- `requireOtp: boolean` — from login flags.
- `onSuccess` — forced → `/`; voluntary → settings.

Use on:

- Desktop route `/change-password`
- PWA same route (responsive layout)

### 9.2 Token storage

After login, persist `access_token` + password flags (`must_change_password`, `password_expired`, `change_password_otp_required`) in memory or secure storage. Refresh flags after successful change-password (all false).

### 9.3 Axios / fetch interceptor

```ts
if (response.status === 403 && response.data?.detail?.includes("Password change required")) {
  router.navigate("/change-password");
}
```

### 9.4 Do not call onboard from create form automatically

Unless product explicitly wants it — API is two steps by design.

---

## 10. Checklist — easy to forget

- [ ] **Two-step admin onboard** — create then `POST /users/{uuid}/onboard`
- [ ] **Password guard before device selection** when `must_change_password`
- [ ] **OTP step** for voluntary change when `change_password_otp_required`
- [ ] **Forgot password** — superadmin hidden/disabled in UI
- [ ] **Reset password** — read `token` from URL query; logout after success
- [ ] **zxcvbn score ≥ 3** on all password fields (create user, change, reset)
- [ ] **Reuse last 3 passwords** — server only; show API error clearly
- [ ] **Email whitelist** — show 422 on create if domain not allowed
- [ ] **403 password lockout** — global handler
- [ ] **EMAIL logs** — admin can debug onboarding / OTP / reset delivery
- [ ] **PWA** — same auth routes; include `device` object on login if required by API
- [ ] **Rate limit 429** — forgot/login; show retry message
- [ ] **Dev debug** — `debug` on forgot-password and OTP responses; hide in prod
- [ ] **Regenerate Orval** after API changes

---

## 11. API quick reference

| Action | Method | Path |
|--------|--------|------|
| Login | POST | `/auth/login` |
| Forgot password | POST | `/auth/forgot-password` |
| Reset password | POST | `/auth/reset-password` |
| Request change OTP | POST | `/auth/change-password/request-otp` |
| Change password | POST | `/auth/change-password` |
| Create user | POST | `/api/users` |
| Send onboard email | POST | `/api/users/{uuid}/onboard` |
| Log source tabs | GET | `/api/logs/filters` |
| Application logs | GET | `/api/logs` |
| Job log tabs | GET | `/api/logs/job/filters` |
| Job logs | GET | `/api/logs/job` |
| Task type tabs | GET | `/api/tasks/filters` |
| Tasks | GET | `/api/tasks` |
| Password reset audit | GET | `/api/password-reset-requests` |

All `/api/*` and authenticated `/auth/*` (except change-password routes) require `Authorization: Bearer <token>`.
