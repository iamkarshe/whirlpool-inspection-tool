export function normalizeAppOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

function readProdUrlFromEnv(): string {
  const fromMeta = import.meta.env.VITE_PROD_URL?.trim();
  if (fromMeta) return fromMeta;

  if (typeof window !== "undefined") {
    const fromWindow = window.__WHIRLPOOL_ENV__?.VITE_PROD_URL?.trim();
    if (fromWindow) return fromWindow;
  }

  return "";
}

/** Canonical production app URL from `VITE_PROD_URL`. */
export function getConfiguredProdAppUrl(): string | null {
  const raw = readProdUrlFromEnv();
  if (!raw) return null;

  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function getCurrentAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.toLowerCase();
}

/** True when the app is open on a host other than `VITE_PROD_URL`. */
export function isNonProductionAppHost(): boolean {
  if (typeof window === "undefined") return false;

  const prodOrigin = getConfiguredProdAppUrl()?.toLowerCase() ?? null;
  if (!prodOrigin) return false;

  return getCurrentAppOrigin() !== prodOrigin;
}
