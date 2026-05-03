import { apiClient } from "@/api/axios-instance";
import { getAuth } from "@/api/generated/auth/auth";
import type { LoginResponse } from "@/api/generated/model/loginResponse";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import { buildLoginDeviceInfo } from "@/lib/device-fingerprint";
import {
  clearServerDeviceUuid,
  setServerDeviceUuidFromLogin,
} from "@/lib/session-device-uuid";
import { PAGES } from "@/endpoints";
import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";
import { isAxiosError } from "axios";

const SESSION_ACCESS_TOKEN_KEY = "whirlpool.access_token";
const SESSION_TOKEN_TYPE_KEY = "whirlpool.token_type";
const SESSION_USER_PAYLOAD_KEY = "whirlpool.user";
const SESSION_ROLE_LEGACY_KEY = "whirlpool.role";

export const LOGIN_PASSWORD_MIN_LENGTH = 6;
export const LOGIN_PASSWORD_MAX_LENGTH = 128;

export {
  getServerAssignedDeviceUuid,
  serverDeviceUuidRef,
} from "@/lib/session-device-uuid";

function normalizeLoginErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : "Something went wrong. Try again.";
  }
  const status = err.response?.status;
  const data = err.response?.data;

  if (status === 401 || status === 403) {
    return "Invalid email or password.";
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray((data as HTTPValidationError).detail)
  ) {
    const detail = (data as HTTPValidationError).detail!;
    const first = detail[0]?.msg ?? detail[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return status ? `Could not login (HTTP ${status}).` : "Could not reach the server. Check API URL.";
}

/** Canonical API roles: `superadmin` | `manager` | `operator` (lowercase). */
export function resolvePostLoginHref(roleRaw: string): string {
  const r = roleRaw.trim().toLowerCase();
  if (r === "operator" || r === "manager") return PAGES.OPS_HOME;
  if (r === "superadmin") return PAGES.DASHBOARD;
  return PAGES.DASHBOARD;
}

function notifySessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}

/** Clears persisted auth and Axios bearer header (logout). */
export function clearAuthenticatedSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_TYPE_KEY);
  window.localStorage.removeItem(SESSION_USER_PAYLOAD_KEY);
  window.localStorage.removeItem(SESSION_ROLE_LEGACY_KEY);
  clearServerDeviceUuid();
  Reflect.deleteProperty(apiClient.defaults.headers.common, "Authorization");
  notifySessionChanged();
}

/** Persists bearer token and primes axios for subsequent `/api/*` calls. */
export function persistAuthenticatedSession(login: LoginResponse): void {
  if (typeof window === "undefined") return;

  const tokenType = login.token_type?.trim() ? login.token_type : "Bearer";
  const token = login.access_token;

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

  const target = resolvePostLoginHref(login.role);
  window.localStorage.setItem(
    SESSION_ROLE_LEGACY_KEY,
    target === PAGES.OPS_HOME ? "ops" : "admin",
  );
  notifySessionChanged();
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  coordinates: { lat: number; lng: number },
): Promise<LoginResponse> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Email is required.");
  }
  if (!password || password.length < LOGIN_PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${LOGIN_PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > LOGIN_PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be at most ${LOGIN_PASSWORD_MAX_LENGTH} characters.`);
  }
  if (
    !Number.isFinite(coordinates.lat) ||
    !Number.isFinite(coordinates.lng)
  ) {
    throw new Error("A valid device location is required to sign in.");
  }

  const device = await buildLoginDeviceInfo({ coordinates });

  try {
    const auth = getAuth();
    const body = await auth.loginAuthLoginPost({
      email: trimmedEmail,
      password,
      device,
    });
    persistAuthenticatedSession(body);
    return body;
  } catch (err: unknown) {
    throw new Error(normalizeLoginErrorMessage(err));
  }
}
