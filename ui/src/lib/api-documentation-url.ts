import { SESSION_ACCESS_TOKEN_KEY } from "@/lib/clear-authenticated-session-storage";

export function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return String(window.__WHIRLPOOL_ENV__?.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
}

function authenticatedDocUrl(path: string): string | null {
  if (typeof window === "undefined") return null;
  const base = resolveApiBaseUrl();
  const token = window.localStorage.getItem(SESSION_ACCESS_TOKEN_KEY)?.trim();
  if (!base || !token) return null;
  return `${base}/${path}?token=${encodeURIComponent(token)}`;
}

/** Opens authenticated Swagger UI (`GET /api-docs?token=…`). */
export function getApiDocumentationUrl(): string | null {
  return authenticatedDocUrl("api-docs");
}

/** Opens authenticated VAPT report (`GET /vapt-report?token=…`). */
export function getVaptReportUrl(): string | null {
  return authenticatedDocUrl("vapt-report");
}

/** Opens authenticated Get Started Guide (`GET /get-started?token=…`). */
export function getGetStartedGuideUrl(): string | null {
  return authenticatedDocUrl("get-started");
}
