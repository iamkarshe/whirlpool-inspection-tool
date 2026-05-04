/**
 * App-wide browser geolocation (see `GeolocationProvider` in `App.tsx`).
 *
 * Before any API that requires `LoginDeviceInfo.current_lat` / `current_lng` (or similar),
 * call `await acquireLocation()` or read `coordinatesRef.current` after a successful
 * `acquireLocation` so you always use the latest fix.
 */
import { createContext, type RefObject } from "react";

export type GeolocationCoords = { lat: number; lng: number };

export type GeolocationStatus =
  | "idle"
  | "prompt"
  | "requesting"
  | "ready"
  | "locked"
  | "unsupported";

export type GeolocationContextValue = {
  status: GeolocationStatus;
  /** True while the in-app location consent / error dialog is open (unmount gate UI above it). */
  isLocationPromptOpen: boolean;
  coordinates: GeolocationCoords | null;
  /**
   * Latest coordinates for synchronous reads (e.g. before firing an API in the same tick).
   * Kept in sync with `coordinates` state.
   */
  coordinatesRef: RefObject<GeolocationCoords | null>;
  lastErrorMessage: string | undefined;
  isLocationReady: boolean;
  /**
   * Opens the location dialog when needed and resolves when acquisition finishes.
   * Resolves with coordinates, or `null` if geolocation is unavailable or permanently blocked.
   * Call this (or read `coordinatesRef.current` after awaiting) immediately before location-backed API calls.
   */
  acquireLocation: () => Promise<GeolocationCoords | null>;
};

export const GeolocationContext = createContext<GeolocationContextValue | null>(
  null,
);
