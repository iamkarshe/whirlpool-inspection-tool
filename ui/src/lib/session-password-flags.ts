import type { LoginResponse } from "@/api/generated/model/loginResponse";
import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";

export const SESSION_PASSWORD_FLAGS_KEY = "whirlpool.password_flags";

export type SessionPasswordFlags = {
  must_change_password: boolean;
  password_expired: boolean;
  change_password_otp_required: boolean;
};

const DEFAULT_FLAGS: SessionPasswordFlags = {
  must_change_password: false,
  password_expired: false,
  change_password_otp_required: false,
};

function readRawFlags(): SessionPasswordFlags {
  if (typeof window === "undefined") return DEFAULT_FLAGS;
  const raw = window.localStorage.getItem(SESSION_PASSWORD_FLAGS_KEY);
  if (!raw) return DEFAULT_FLAGS;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionPasswordFlags>;
    return {
      must_change_password: parsed.must_change_password === true,
      password_expired: parsed.password_expired === true,
      change_password_otp_required: parsed.change_password_otp_required === true,
    };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function getSessionPasswordFlags(): SessionPasswordFlags {
  return readRawFlags();
}

export function persistPasswordFlagsFromLogin(login: LoginResponse): void {
  if (typeof window === "undefined") return;
  const flags: SessionPasswordFlags = {
    must_change_password: login.must_change_password === true,
    password_expired: login.password_expired === true,
    change_password_otp_required: login.change_password_otp_required === true,
  };
  window.localStorage.setItem(
    SESSION_PASSWORD_FLAGS_KEY,
    JSON.stringify(flags),
  );
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}

export function clearPasswordFlags(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_PASSWORD_FLAGS_KEY);
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}

export function markPasswordChangeComplete(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SESSION_PASSWORD_FLAGS_KEY,
    JSON.stringify(DEFAULT_FLAGS),
  );
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}

export function requiresPasswordChange(
  flags: SessionPasswordFlags = getSessionPasswordFlags(),
): boolean {
  return flags.must_change_password || flags.password_expired;
}
