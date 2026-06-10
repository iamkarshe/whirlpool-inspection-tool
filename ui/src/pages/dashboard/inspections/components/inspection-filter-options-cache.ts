import type { InspectionFilterOptionsSource } from "@/pages/dashboard/inspections/components/inspection-filter-options-types";
import { SESSION_USER_PAYLOAD_KEY } from "@/lib/clear-authenticated-session-storage";

/** Bump when filter metadata shape or fetch strategy changes (invalidates session cache). */
const CACHE_VERSION = 4;
const CACHE_KEY_PREFIX = `whirlpool.inspection-filter-options:v${CACHE_VERSION}:`;

function inspectionFilterOptionsCacheKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_USER_PAYLOAD_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as { uuid?: string };
    const uuid = user.uuid?.trim();
    return uuid ? `${CACHE_KEY_PREFIX}${uuid}` : null;
  } catch {
    return null;
  }
}

let memoryCache: InspectionFilterOptionsSource | null = null;
let inflight: Promise<InspectionFilterOptionsSource> | null = null;

export function readCachedInspectionFilterOptions(): InspectionFilterOptionsSource | null {
  if (memoryCache) return memoryCache;
  const key = inspectionFilterOptionsCacheKey();
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InspectionFilterOptionsSource;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedInspectionFilterOptions(
  source: InspectionFilterOptionsSource,
): void {
  memoryCache = source;
  const key = inspectionFilterOptionsCacheKey();
  if (!key || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(source));
  } catch {
    // Quota or private mode — in-memory cache still applies for this tab.
  }
}

export function clearInspectionFilterOptionsCache(): void {
  memoryCache = null;
  inflight = null;
  const key = inspectionFilterOptionsCacheKey();
  if (key && typeof window !== "undefined") {
    window.sessionStorage.removeItem(key);
  }
}

/**
 * Session-cached filter metadata from GET /api/reports/kpi-parameters. In-flight dedup must not
 * reuse a promise tied to an aborted Strict Mode mount — callers may pass
 * `signal` for cleanup, but the shared fetch ignores it.
 */
export async function loadInspectionFilterOptionsCached(
  fetcher: (opts?: { signal?: AbortSignal }) => Promise<InspectionFilterOptionsSource>,
  _opts?: { signal?: AbortSignal },
): Promise<InspectionFilterOptionsSource> {
  const cached = readCachedInspectionFilterOptions();
  if (cached) return cached;

  if (inflight) return inflight;

  inflight = fetcher()
    .then((source) => {
      writeCachedInspectionFilterOptions(source);
      return source;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
