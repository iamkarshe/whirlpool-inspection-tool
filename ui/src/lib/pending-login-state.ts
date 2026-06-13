import type { LoginResponse } from "@/api/generated/model/loginResponse";

const PENDING_LOGIN_KEY = "whirlpool.pending_login";

type PendingLoginSnapshot = Pick<
  LoginResponse,
  | "requires_device_selection"
  | "active_devices"
  | "allow_multi_login"
  | "device_uuid"
  | "role"
  | "name"
>;

export function persistPendingLoginForPasswordChange(
  login: LoginResponse,
): void {
  if (typeof window === "undefined") return;
  if (!login.must_change_password && !login.password_expired) return;

  const snapshot: PendingLoginSnapshot = {
    requires_device_selection: login.requires_device_selection,
    active_devices: login.active_devices,
    allow_multi_login: login.allow_multi_login,
    device_uuid: login.device_uuid,
    role: login.role,
    name: login.name,
  };
  window.sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(snapshot));
}

export function readPendingLoginState(): LoginResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LoginResponse>;
    if (typeof parsed.role !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    return parsed as LoginResponse;
  } catch {
    return null;
  }
}

export function clearPendingLoginState(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
}
