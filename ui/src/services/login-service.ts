import { apiClient } from "@/api/axios-instance";
import { getAuth } from "@/api/generated/auth/auth";
import type { ActiveDeviceListResponse } from "@/api/generated/model/activeDeviceListResponse";
import type { ActiveDeviceResponse } from "@/api/generated/model/activeDeviceResponse";
import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { ResolveDevicesResponse } from "@/api/generated/model/resolveDevicesResponse";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import { buildLoginDeviceInfo } from "@/lib/device-fingerprint";
import {
  clearAuthenticatedSessionStorage,
  SESSION_ACCESS_TOKEN_KEY,
  SESSION_ROLE_LEGACY_KEY,
  SESSION_TOKEN_TYPE_KEY,
  SESSION_USER_PAYLOAD_KEY,
} from "@/lib/clear-authenticated-session-storage";
import { setServerDeviceUuidFromLogin } from "@/lib/session-device-uuid";
import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";
import {
  persistPasswordFlagsFromLogin,
} from "@/lib/session-password-flags";
import { PAGES } from "@/endpoints";
import { isAxiosError } from "axios";

export { requiresPasswordChange } from "@/lib/session-password-flags";

export const LOGIN_PASSWORD_MIN_LENGTH = 6;
export const LOGIN_PASSWORD_MAX_LENGTH = 128;
/** Matches OpenAPI `LoginTokenRequest.access_token` minLength. */
export const SSO_EXCHANGE_TOKEN_MIN_LENGTH = 10;

export {
  getServerAssignedDeviceUuid,
  serverDeviceUuidRef,
} from "@/lib/session-device-uuid";

function extractApiDetailMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("detail" in data)) {
    return null;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    const first = (detail as HTTPValidationError["detail"])?.[0]?.msg ??
      (detail as HTTPValidationError["detail"])?.[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  return null;
}

export function shouldShowDeviceSelection(login: LoginResponse): boolean {
  return login.requires_device_selection === true;
}

export function loginRequiresMfaVerification(login: LoginResponse): boolean {
  return (
    login.mfa_required === true && Boolean(login.mfa_pending_token?.trim())
  );
}

export function loginRequiresMfaSetup(login: LoginResponse): boolean {
  return (
    login.mfa_setup_required === true &&
    Boolean(login.mfa_pending_token?.trim())
  );
}

export function isLoginAccessTokenReady(login: LoginResponse): boolean {
  return Boolean(login.access_token?.trim());
}

export function loginRequiresPasswordChange(login: LoginResponse): boolean {
  return (
    login.must_change_password === true || login.password_expired === true
  );
}

export function canCallDeviceResolve(allowMultiLogin: boolean): boolean {
  return allowMultiLogin === false;
}

/** UUID for the device that just completed login (this browser). */
export function getCurrentDeviceUuidFromLogin(
  login: LoginResponse,
): string | null {
  const fromSession = login.device_uuid?.trim();
  if (fromSession) return fromSession;
  const marked = login.active_devices?.find((d) => d.is_current)?.uuid?.trim();
  return marked || null;
}

function normalizeLoginErrorMessage(
  err: unknown,
  unauthorizedFallback = "Invalid email or password.",
): string {
  if (!isAxiosError(err)) {
    return err instanceof Error
      ? err.message
      : "Something went wrong. Try again.";
  }
  const status = err.response?.status;
  const detailMessage = extractApiDetailMessage(err.response?.data);
  if (detailMessage) return detailMessage;

  if (status === 401 || status === 403) {
    return unauthorizedFallback;
  }
  if (typeof err.message === "string" && err.message.length > 0)
    return err.message;
  return status
    ? `Could not login (HTTP ${status}).`
    : "Could not reach the server. Check API URL.";
}

/** Canonical API roles: `superadmin` | `manager` | `operator` (lowercase). */
export function resolvePostLoginHref(roleRaw: string): string {
  const r = roleRaw.trim().toLowerCase();
  if (r === "operator" || r === "manager") return PAGES.OPS_HOME;
  return PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS;
}

/** Clears persisted auth and Axios bearer header (logout). */
export function clearAuthenticatedSession(): void {
  if (typeof window === "undefined") return;
  clearAuthenticatedSessionStorage();
  Reflect.deleteProperty(apiClient.defaults.headers.common, "Authorization");
}

/** Persists bearer token and primes axios for subsequent `/api/*` calls. */
export function persistAuthenticatedSession(login: LoginResponse): void {
  if (typeof window === "undefined") return;

  const token = login.access_token?.trim();
  if (!token) return;

  const tokenType = login.token_type?.trim() ? login.token_type : "Bearer";

  window.localStorage.setItem(SESSION_ACCESS_TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_TOKEN_TYPE_KEY, tokenType);
  window.localStorage.setItem(
    SESSION_USER_PAYLOAD_KEY,
    JSON.stringify({
      id: login.id,
      uuid: login.uuid,
      name: login.name,
      email: login.email,
      role: login.role,
      designation: login.designation,
      is_active: login.is_active,
      allowed_warehouses: login.allowed_warehouses ?? null,
    }),
  );
  setServerDeviceUuidFromLogin(login.device_uuid);
  apiClient.defaults.headers.common.Authorization = `${tokenType} ${token}`;
  persistPasswordFlagsFromLogin(login);

  const target = resolvePostLoginHref(login.role);
  window.localStorage.setItem(
    SESSION_ROLE_LEGACY_KEY,
    target === PAGES.OPS_HOME ? "ops" : "admin",
  );
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}

export async function resolveLoginDevices(
  keepDeviceUuids: string[],
): Promise<ResolveDevicesResponse> {
  const unique = [...new Set(keepDeviceUuids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("Select at least one device to keep signed in.");
  }

  try {
    const auth = getAuth();
    return await auth.resolveAuthDevicesAuthDevicesResolvePost({
      keep_device_uuids: unique,
    });
  } catch (err: unknown) {
    throw new Error(normalizeLoginErrorMessage(err, "Could not update devices."));
  }
}

export async function fetchActiveAuthDevices(): Promise<ActiveDeviceListResponse> {
  try {
    const auth = getAuth();
    return await auth.listActiveAuthDevicesAuthDevicesActiveGet();
  } catch (err: unknown) {
    throw new Error(normalizeLoginErrorMessage(err, "Could not load devices."));
  }
}

export async function deregisterAuthDevice(deviceUuid: string): Promise<void> {
  const id = deviceUuid.trim();
  if (!id) throw new Error("Device id is required.");

  try {
    const auth = getAuth();
    await auth.deregisterAuthDeviceAuthDevicesDeviceUuidDeregisterPost(id);
  } catch (err: unknown) {
    throw new Error(normalizeLoginErrorMessage(err, "Could not sign out that device."));
  }
}

export async function authenticateWithEmailPassword(
  email: string,
  password: string,
  coordinates: { lat: number; lng: number },
): Promise<LoginResponse> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Email is required.");
  }
  if (!password || password.length < LOGIN_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${LOGIN_PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  if (password.length > LOGIN_PASSWORD_MAX_LENGTH) {
    throw new Error(
      `Password must be at most ${LOGIN_PASSWORD_MAX_LENGTH} characters.`,
    );
  }
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    throw new Error("A valid device location is required to sign in.");
  }

  const device = await buildLoginDeviceInfo({ coordinates });

  try {
    const auth = getAuth();
    return await auth.loginAuthLoginPost({
      email: trimmedEmail,
      password,
      device,
    });
  } catch (err: unknown) {
    throw new Error(normalizeLoginErrorMessage(err));
  }
}

/** @deprecated Prefer authenticate + persist + device selection flow. */
export async function loginWithEmailPassword(
  email: string,
  password: string,
  coordinates: { lat: number; lng: number },
): Promise<LoginResponse> {
  const body = await authenticateWithEmailPassword(email, password, coordinates);
  persistAuthenticatedSession(body);
  return body;
}

/** Completes Okta SSO after redirect to `/login?token=…`. */
export async function authenticateWithSsoExchangeToken(
  exchangeToken: string,
  coordinates: { lat: number; lng: number },
): Promise<LoginResponse> {
  const token = exchangeToken.trim();
  if (token.length < SSO_EXCHANGE_TOKEN_MIN_LENGTH) {
    throw new Error("Invalid or expired sign-in link. Please use Okta SSO again.");
  }
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    throw new Error("A valid device location is required to sign in.");
  }

  const device = await buildLoginDeviceInfo({ coordinates });

  try {
    const auth = getAuth();
    return await auth.loginTokenAuthLoginTokenPost({
      access_token: token,
      device,
    });
  } catch (err: unknown) {
    throw new Error(
      normalizeLoginErrorMessage(
        err,
        "Invalid or expired sign-in link. Please use Okta SSO again.",
      ),
    );
  }
}

/** @deprecated Prefer authenticate + persist + device selection flow. */
export async function loginWithSsoExchangeToken(
  exchangeToken: string,
  coordinates: { lat: number; lng: number },
): Promise<LoginResponse> {
  const body = await authenticateWithSsoExchangeToken(exchangeToken, coordinates);
  persistAuthenticatedSession(body);
  return body;
}

export function getLoginActiveDevices(login: LoginResponse): ActiveDeviceResponse[] {
  return login.active_devices ?? [];
}
