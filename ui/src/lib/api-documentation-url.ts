import { SESSION_ACCESS_TOKEN_KEY } from "@/lib/clear-authenticated-session-storage";

export function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return String(window.__WHIRLPOOL_ENV__?.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
}

/** Opens authenticated Swagger UI (`GET /api-docs?token=…`). */
export function getApiDocumentationUrl(): string | null {
  if (typeof window === "undefined") return null;
  const base = resolveApiBaseUrl();
  const token = window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY)?.trim();
  if (!base || !token) return null;
  return `${base}/api-docs?token=${encodeURIComponent(token)}`;
}
