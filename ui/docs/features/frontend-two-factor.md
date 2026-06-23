# Two-Factor Authentication (TOTP) — frontend spec

TOTP-based 2FA using authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.).

**Backend reference:** `mod/auth/two_factor_router.py`, `mod/auth/two_factor_helper.py`, `utils/two_factor.py`.

---

## Who can do what

| Action | Who |
| ------ | --- |
| Enroll / confirm own 2FA | Signed-in user (`POST /auth/2fa/setup`, `POST /auth/2fa/confirm`) |
| Disable own 2FA (has authenticator) | Signed-in user (`POST /auth/2fa/disable`) — blocked when admin-enforced |
| **Reset own 2FA** (lost app, has password + session) | Signed-in user (`POST /auth/2fa/reset`) |
| Enforce 2FA for a user | Superadmin (`PUT /api/users/{user_uuid}` → `two_factor_enforced: true`) |
| **Reset another user's 2FA** | **Superadmin only** (`POST /api/users/{user_uuid}/reset-2fa`) |

Managers, biz-admins, and operators **cannot** reset 2FA for other users.

If a user is locked out (lost authenticator + no active session), only a **superadmin** can reset their 2FA from the admin console.

---

## Environment (API server)

```env
# Label shown in authenticator apps (issuer field).
TWO_FACTOR_ISSUER=Whirlpool PDI Tool
```

TOTP secrets are encrypted at rest using `JWT_SECRET`. No separate TOTP env key is required.

See `env.example` for the full sample block.

---

## Login flow

### Step 1 — credentials

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "user@whirlpool.com",
  "password": "secret",
  "device": { ... }
}
```

Or SSO: `POST /auth/login-token` with Okta exchange token.

### Step 1 response branches

| Condition | Response flags | Next step |
| --------- | -------------- | --------- |
| No 2FA | `access_token` populated, `mfa_required: false` | Normal login |
| 2FA enabled | `access_token: ""`, `mfa_required: true`, `mfa_pending_token` | Verify TOTP |
| Admin enforced, not enrolled | `access_token: ""`, `mfa_setup_required: true`, `mfa_pending_token` | Setup + verify |

```json
{
  "id": 3,
  "uuid": "...",
  "name": "Arun Dev Kumar",
  "email": "arun@whirlpool.com",
  "role": "manager",
  "access_token": "",
  "mfa_required": true,
  "mfa_setup_required": false,
  "mfa_pending_token": "eyJ...",
  "two_factor_enabled": true,
  "two_factor_enforced": false,
  "must_change_password": false
}
```

`mfa_pending_token` expires in **10 minutes**.

### Step 2a — verify TOTP (existing enrollment)

```http
POST /auth/login/verify-2fa
Content-Type: application/json
```

```json
{
  "mfa_pending_token": "eyJ...",
  "totp_code": "123456"
}
```

Response: full `LoginResponse` with `access_token`.

### Step 2b — enforced setup during login

1. `POST /auth/login/2fa/setup`

```json
{ "mfa_pending_token": "eyJ..." }
```

Response:

```json
{
  "secret_key": "JBSWY3DPEHPK3PXP",
  "provisioning_uri": "otpauth://totp/Whirlpool%20PDI%20Tool:user%40whirlpool.com?secret=...&issuer=Whirlpool%20PDI%20Tool",
  "issuer": "Whirlpool PDI Tool"
}
```

2. Render QR from `provisioning_uri` (use a library such as `qrcode.react`).

3. `POST /auth/login/verify-2fa` with first code from the app → enables 2FA and returns `access_token`.

---

## Authenticated user — account settings

All routes require `Authorization: Bearer <access_token>`.

### Status

```http
GET /auth/2fa/status
```

```json
{
  "two_factor_enabled": true,
  "two_factor_enforced": false,
  "two_factor_setup_required": false
}
```

### Personal enrollment

```text
POST /auth/2fa/setup     → QR + secret_key
POST /auth/2fa/confirm   → { "totp_code": "123456" }
```

### Disable (user still has authenticator)

```http
POST /auth/2fa/disable
```

```json
{ "totp_code": "123456" }
```

Returns `403` when `two_factor_enforced` is true.

### Reset own 2FA (password, no TOTP needed)

Use when the user lost their authenticator but still has an active session, or wants to pair a new device.

```http
POST /auth/2fa/reset
```

```json
{ "current_password": "YourCurrentPassword123" }
```

Response:

```json
{
  "message": "Two-factor authentication reset",
  "user_uuid": "...",
  "two_factor_enabled": false,
  "two_factor_enforced": true
}
```

When `two_factor_enforced` is still true, prompt the user to call `POST /auth/2fa/setup` → `POST /auth/2fa/confirm` before logging out, or they will be forced through login setup on next sign-in.

---

## Admin console (superadmin only)

### Enforce 2FA for a user

```http
PUT /api/users/{user_uuid}
Authorization: Bearer <superadmin_token>
```

```json
{ "two_factor_enforced": true }
```

User must enroll on next login (or while signed in via personal setup).

### Reset another user's 2FA

```http
POST /api/users/{user_uuid}/reset-2fa
Authorization: Bearer <superadmin_token>
```

No request body. Response:

```json
{
  "message": "Two-factor authentication reset",
  "user_uuid": "...",
  "two_factor_enabled": false,
  "two_factor_enforced": true
}
```

| Error | When |
| ----- | ---- |
| `403` | Caller is not superadmin, or target is a superadmin account |
| `404` | User not found |

`UserResponse` from `GET /api/users` includes `two_factor_enabled` and `two_factor_enforced` for table badges and actions.

---

## UI recommendations

### Login screen

```text
┌─────────────────────────────────────┐
│  Sign in                            │
│  [email] [password]                 │
│  [Sign in]                          │
└─────────────────────────────────────┘
         ↓ mfa_required
┌─────────────────────────────────────┐
│  Authenticator code                 │
│  [ 6-digit code ]                   │
│  [Verify]                           │
└─────────────────────────────────────┘
         ↓ mfa_setup_required
┌─────────────────────────────────────┐
│  Set up two-factor authentication   │
│  [QR code from provisioning_uri]    │
│  Manual key: JBSW...                │
│  [ 6-digit code ] [Complete setup]  │
└─────────────────────────────────────┘
```

### Account security settings

| State | Show |
| ----- | ---- |
| Not enabled, not enforced | “Enable 2FA” → setup flow |
| Enabled, not enforced | “Disable 2FA” (needs TOTP) + “Reset 2FA” (needs password) |
| Enforced, not enabled | Banner: “Required by admin — set up now” |
| Enforced, enabled | “Reset 2FA” (password) only; no disable |

### Admin user detail

| Control | Visible when |
| ------- | ------------ |
| Toggle `two_factor_enforced` | Superadmin editing non-superadmin user |
| “Reset 2FA” button | Superadmin, target is not superadmin |

---

## Suggested frontend files

| File | Role |
| ---- | ---- |
| `src/services/two-factor-api.ts` | API wrappers |
| `src/pages/login/two-factor-verify.tsx` | Login step 2 |
| `src/pages/login/two-factor-setup.tsx` | Enforced enrollment during login |
| `src/pages/settings/security/two-factor.tsx` | Personal setup / disable / reset |
| `src/pages/admin/users/components/two-factor-actions.tsx` | Enforce toggle + superadmin reset |

### QR code example

```typescript
import QRCode from "qrcode.react";

function TotpQr({ provisioningUri }: { provisioningUri: string }) {
  return <QRCode value={provisioningUri} size={200} level="M" />;
}
```

### Login handler sketch

```typescript
async function handleLogin(email: string, password: string) {
  const result = await login({ email, password, device: buildDeviceInfo() });

  if (result.mfa_setup_required) {
    navigate("/login/2fa-setup", { state: { mfaPendingToken: result.mfa_pending_token } });
    return;
  }

  if (result.mfa_required) {
    navigate("/login/2fa-verify", { state: { mfaPendingToken: result.mfa_pending_token } });
    return;
  }

  saveSession(result.access_token);
  navigate("/dashboard");
}
```

---

## Disable vs reset

| Endpoint | Needs | Use case |
| -------- | ----- | -------- |
| `POST /auth/2fa/disable` | Valid TOTP code | Turn off optional 2FA |
| `POST /auth/2fa/reset` | Account password | Lost authenticator, re-pair device |
| `POST /api/users/{uuid}/reset-2fa` | Superadmin session | User locked out, admin recovery |

---

## OpenAPI / Orval

After deploy, regenerate the client and map new `LoginResponse` fields:

- `mfa_required`
- `mfa_setup_required`
- `mfa_pending_token`
- `two_factor_enabled`
- `two_factor_enforced`

---

## Acceptance criteria

- [ ] Login handles `mfa_required` and `mfa_setup_required` without storing empty `access_token`
- [ ] QR renders from `provisioning_uri`
- [ ] Personal setup: setup → confirm
- [ ] Personal disable blocked when `two_factor_enforced`
- [ ] Personal reset requires password (`POST /auth/2fa/reset`)
- [ ] Admin enforce toggle on user edit (superadmin only)
- [ ] Admin reset button visible only to superadmin, hidden for superadmin targets
- [ ] Locked-out users directed to contact admin (superadmin reset)
- [ ] Error toasts for invalid TOTP (`401`) and wrong password on reset (`401`)
