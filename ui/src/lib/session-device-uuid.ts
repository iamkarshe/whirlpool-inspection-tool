/**
 * Server-assigned device UUID from `LoginResponse.device_uuid`, persisted after login.
 * Use for authenticated API payloads (e.g. `device_uuid` on inspection start).
 */

export const SESSION_DEVICE_UUID_STORAGE_KEY = "whirlpool.sessionDeviceUuid";

/** In-memory ref synced with {@link SESSION_DEVICE_UUID_STORAGE_KEY} for callers and interceptors. */
export const serverDeviceUuidRef: { current: string | null } = { current: null };

export function bootstrapServerDeviceUuidFromStorage(): void {
  if (typeof window === "undefined") return;
  const v = window.localStorage.getItem(SESSION_DEVICE_UUID_STORAGE_KEY)?.trim();
  serverDeviceUuidRef.current = v && v.length > 0 ? v : null;
}

export function getServerAssignedDeviceUuid(): string | null {
  if (serverDeviceUuidRef.current) return serverDeviceUuidRef.current;
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(SESSION_DEVICE_UUID_STORAGE_KEY)?.trim();
  serverDeviceUuidRef.current = v && v.length > 0 ? v : null;
  return serverDeviceUuidRef.current;
}

export function setServerDeviceUuidFromLogin(uuid: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const t = typeof uuid === "string" ? uuid.trim() : "";
  if (t.length > 0) {
    window.localStorage.setItem(SESSION_DEVICE_UUID_STORAGE_KEY, t);
    serverDeviceUuidRef.current = t;
  } else {
    window.localStorage.removeItem(SESSION_DEVICE_UUID_STORAGE_KEY);
    serverDeviceUuidRef.current = null;
  }
}

export function clearServerDeviceUuid(): void {
  setServerDeviceUuidFromLogin(null);
}
