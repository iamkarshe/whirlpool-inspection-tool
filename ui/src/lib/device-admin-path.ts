/** Matches standard UUID hex form (any version). */
const DEVICE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HEX32_RE = /^[0-9a-f]{32}$/i;

/** Canonical lowercase hyphenated UUID for `/api/devices/{uuid}` URLs. */
function normalizeDeviceUuidCandidate(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  if (s.toLowerCase().startsWith("urn:uuid:")) {
    s = s.slice("urn:uuid:".length).trim();
  }

  if (DEVICE_UUID_RE.test(s)) {
    return s.toLowerCase();
  }

  const compact = s.replace(/-/g, "");
  if (HEX32_RE.test(compact)) {
    const h = compact.toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  return "";
}

/**
 * Returns `devices.uuid` suitable for `PAGES.deviceViewPath(uuid)` (admin device detail).
 * Accepts hyphenated UUIDs, 32-hex compact form, and `urn:uuid:` prefix. Rejects numeric PKs
 * and other non-UUID strings.
 */
export function deviceUuidForAdminDevicePath(
  value: string | undefined | null,
): string {
  const s = value?.trim() ?? "";
  if (!s) return "";
  const normalized = normalizeDeviceUuidCandidate(s);
  return normalized && DEVICE_UUID_RE.test(normalized) ? normalized : "";
}
