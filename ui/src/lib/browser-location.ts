const DEFAULT_TIMEOUT_MS = 25_000;

export function isGeolocationSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.geolocation !== "undefined" &&
    typeof navigator.geolocation.getCurrentPosition === "function"
  );
}

export type BrowserLocationResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; code: number; message: string };

function readPosition(position: GeolocationPosition): BrowserLocationResult {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      code: 2,
      message: "Location coordinates were invalid.",
    };
  }
  return { ok: true, lat, lng };
}

type RequestOptions = {
  timeoutMs?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
};

/**
 * Requests a one-shot browser position (high accuracy, with timeout).
 */
export function requestCurrentPosition(
  overrides?: RequestOptions,
): Promise<BrowserLocationResult> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({
      ok: false,
      code: 2,
      message: "Location services are not available in this browser.",
    });
  }

  const timeoutMs = overrides?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(readPosition(position));
      },
      (err) => {
        const message =
          err.code === 1
            ? "Location permission was denied."
            : err.code === 2
              ? "Location could not be determined."
              : err.code === 3
                ? "Location request timed out."
                : err.message || "Location request failed.";
        resolve({ ok: false, code: err.code, message });
      },
      {
        enableHighAccuracy: overrides?.enableHighAccuracy ?? true,
        maximumAge: overrides?.maximumAge ?? 0,
        timeout: timeoutMs,
      },
    );
  });
}
