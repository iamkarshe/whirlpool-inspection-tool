/** Matches standard UUID hex form (any version). */
const DEVICE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns `devices.uuid` suitable for `PAGES.deviceViewPath(uuid)` (admin device detail).
 * Rejects numeric primary keys and other non-UUID strings.
 */
export function deviceUuidForAdminDevicePath(
  value: string | undefined | null,
): string {
  const s = value?.trim() ?? "";
  if (!s || !DEVICE_UUID_RE.test(s)) return "";
  return s;
}
