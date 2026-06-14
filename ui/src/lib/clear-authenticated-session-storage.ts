import { clearInspectionFilterOptionsCache } from "@/pages/dashboard/inspections/components/inspection-filter-options-cache";
import { clearReleaseNotesCache } from "@/services/release-notes-api";
import { clearWarehousesListCache } from "@/services/warehouses-api";
import { clearPendingLoginState } from "@/lib/pending-login-state";
import { clearPasswordFlags } from "@/lib/session-password-flags";
import { clearServerDeviceUuid } from "@/lib/session-device-uuid";
import { WHIRLPOOL_SESSION_CHANGED_EVENT } from "@/lib/session-events";

export const SESSION_ACCESS_TOKEN_KEY = "whirlpool.access_token";
export const SESSION_TOKEN_TYPE_KEY = "whirlpool.token_type";
export const SESSION_USER_PAYLOAD_KEY = "whirlpool.user";
export const SESSION_ROLE_LEGACY_KEY = "whirlpool.role";

/** Clears persisted session keys (no Axios). */
export function clearAuthenticatedSessionStorage(): void {
  if (typeof window === "undefined") return;
  clearInspectionFilterOptionsCache();
  clearReleaseNotesCache();
  clearWarehousesListCache();
  window.localStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_TYPE_KEY);
  window.localStorage.removeItem(SESSION_USER_PAYLOAD_KEY);
  window.localStorage.removeItem(SESSION_ROLE_LEGACY_KEY);
  clearServerDeviceUuid();
  clearPasswordFlags();
  clearPendingLoginState();
  window.dispatchEvent(new Event(WHIRLPOOL_SESSION_CHANGED_EVENT));
}
