import type { LoginDeviceInfo } from "@/api/generated/model/loginDeviceInfo";

/** Same key already used elsewhere in the app (`AppSidebar`). */
export const DEVICE_FINGERPRINT_STORAGE_KEY = "whirlpool.deviceFingerprint";

function stableStringifyPayload(value: Record<string, unknown>): string {
  const keys = [...Object.keys(value)].sort((a, b) => a.localeCompare(b));
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    sorted[k] = value[k];
  }
  return JSON.stringify(sorted);
}

async function digestHex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const subtle =
    typeof globalThis !== "undefined" ? globalThis.crypto?.subtle : undefined;
  if (!subtle) {
    return digestHexFallback(input);
  }
  const digest = await subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]?.toString(16).padStart(2, "0") ?? "00";
  }
  return hex;
}

/** Deterministic-ish fallback when `crypto.subtle` is unavailable. */
function digestHexFallback(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let hex = "";
  let x = Math.abs(h) >>> 0;
  for (let i = 0; i < 32; i++) {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    hex += (x % 16).toString(16);
  }
  while (hex.length < 64) {
    hex += hex;
  }
  return hex.slice(0, 64);
}

/**
 * Stable per-browser/device id persisted in storage (not rotated on each login).
 */
export function getOrCreatePersistentDeviceId(): string {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage === "undefined"
  ) {
    throw new Error("Persistent device id is only available in a browser.");
  }

  let id = window.localStorage.getItem(DEVICE_FINGERPRINT_STORAGE_KEY);
  if (id && id.trim().length > 0) {
    return id.trim();
  }

  const cryptoRef =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  id =
    typeof cryptoRef?.randomUUID === "function"
      ? cryptoRef.randomUUID()
      : `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(DEVICE_FINGERPRINT_STORAGE_KEY, id);
  return id;
}

function resolveDeviceType(): "desktop" | "mobile" {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }
  const ua = navigator.userAgent;
  const coarseMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/u.test(
      ua,
    ) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth <= 896);
  return coarseMobile ? "mobile" : "desktop";
}

function buildDeviceInfoSignals(
  persistentId: string,
): LoginDeviceInfo["device_info"] {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const scr = typeof screen !== "undefined" ? screen : undefined;
  const memNav = nav as Navigator & { deviceMemory?: number };

  return {
    persistentDeviceId: persistentId,
    userAgent: nav?.userAgent ?? "",
    platform: nav?.platform ?? "",
    languages: nav?.languages ? [...nav.languages] : [],
    vendor: nav?.vendor ?? "",
    hardwareConcurrency: nav?.hardwareConcurrency,
    deviceMemory: memNav?.deviceMemory,
    maxTouchPoints: nav?.maxTouchPoints,
    cookieEnabled: nav?.cookieEnabled,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffsetMinutes: new Date().getTimezoneOffset(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    screen: scr
      ? {
          width: scr.width,
          height: scr.height,
          availWidth: scr.availWidth,
          availHeight: scr.availHeight,
          orientation:
            typeof screen.orientation?.type === "string"
              ? screen.orientation?.type
              : undefined,
          colorDepth: scr.colorDepth,
          pixelDepth: scr.pixelDepth,
        }
      : {},
    viewport:
      typeof window !== "undefined"
        ? {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          }
        : {},
    webdriver: !!(
      nav &&
      "webdriver" in nav &&
      (nav as { webdriver?: boolean }).webdriver
    ),
  };
}

/** Synthetic IMEI surrogate for browser clients (`LoginRequest.device.imei` is required-length string). */
function buildSyntheticWebImei(persistentId: string): string {
  const compact = `WB-${persistentId.replace(/-/g, "").slice(0, 36)}`;
  return compact.length >= 3 ? compact.slice(0, 48) : "WBX";
}

/**
 * Builds `LoginDeviceInfo` for `/auth/login` using a persisted id plus a deterministic
 * fingerprint from runtime signals + optional canvas noise.
 */
export async function buildLoginDeviceInfo(options?: {
  /** Extra entropy (e.g. tiny canvas fingerprint) hashed into the fingerprint string. */
  canvasNoise?: string;
  /** Browser geolocation for `LoginDeviceInfo.current_lat` / `current_lng`. */
  coordinates?: { lat: number; lng: number } | null;
}): Promise<LoginDeviceInfo> {
  const persistentId = getOrCreatePersistentDeviceId();
  const device_info = buildDeviceInfoSignals(persistentId);
  let canvasNoise = options?.canvasNoise ?? "";

  if (!canvasNoise && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 60;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "alphabetic";
        ctx.font = `${14 + (navigator?.hardwareConcurrency ?? 1)}px Arial`;
        ctx.fillStyle = "#4b5563";
        ctx.fillRect(4, 4, 212, 52);
        ctx.fillStyle = "#f9fafb";
        ctx.fillText(`fp:${persistentId.slice(0, 8)}`, 10, 30);
        ctx.fillStyle = "rgba(251,146,60,0.6)";
        ctx.fillText(navigator.language, 120, 38);
        canvasNoise = canvas.toDataURL();
      }
    } catch {
      canvasNoise = "canvas-unavailable";
    }
  }

  const payload = stableStringifyPayload({
    ...device_info,
    canvasNoiseSnippet: canvasNoise.slice(0, 120),
  });
  const hash = await digestHex(`${persistentId}:${payload}`);
  let device_fingerprint = `${persistentId}.${hash}`;
  if (device_fingerprint.length > 255) {
    device_fingerprint = `${persistentId}.${hash.slice(0, 255 - persistentId.length - 1)}`;
  }
  while (device_fingerprint.length < 10) {
    device_fingerprint += "0";
  }

  const lat = options?.coordinates?.lat;
  const lng = options?.coordinates?.lng;

  return {
    imei: buildSyntheticWebImei(persistentId),
    device_type: resolveDeviceType(),
    device_fingerprint,
    device_info,
    current_lat:
      typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    current_lng:
      typeof lng === "number" && Number.isFinite(lng) ? lng : null,
  };
}
