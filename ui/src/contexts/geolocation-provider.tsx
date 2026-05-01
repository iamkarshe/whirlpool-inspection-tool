import DialogRequestLocation, {
  type DialogRequestLocationMode,
} from "@/components/dialogs/dialog-request-location";
import { GeolocationContext } from "@/contexts/geolocation-context";
import type {
  GeolocationContextValue,
  GeolocationCoords,
  GeolocationStatus,
} from "@/contexts/geolocation-context";
import {
  isGeolocationSupported,
  requestCurrentPosition,
} from "@/lib/browser-location";
import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const coordinatesRef = useRef<GeolocationCoords | null>(null);
  const statusRef = useRef<GeolocationStatus>("idle");
  const pendingResolvers = useRef<
    Array<(value: GeolocationCoords | null) => void>
  >([]);

  const [status, setStatusState] = useState<GeolocationStatus>("idle");
  const [coordinates, setCoordinatesState] = useState<GeolocationCoords | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | undefined>();

  const setStatus = useCallback((next: GeolocationStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const setCoordinates = useCallback((next: GeolocationCoords | null) => {
    coordinatesRef.current = next;
    setCoordinatesState(next);
  }, []);

  const flushPending = useCallback((value: GeolocationCoords | null) => {
    const list = pendingResolvers.current;
    pendingResolvers.current = [];
    for (const resolve of list) {
      resolve(value);
    }
  }, []);

  const acquireLocation = useCallback((): Promise<GeolocationCoords | null> => {
    if (!isGeolocationSupported()) {
      setStatus("unsupported");
      setDialogOpen(true);
      return Promise.resolve(null);
    }

    if (statusRef.current === "unsupported") {
      setDialogOpen(true);
      return Promise.resolve(null);
    }

    if (statusRef.current === "ready" && coordinatesRef.current) {
      return Promise.resolve(coordinatesRef.current);
    }

    if (statusRef.current === "locked") {
      setLastErrorMessage(undefined);
      setStatus("prompt");
    }

    return new Promise((resolve) => {
      pendingResolvers.current.push(resolve);
      setDialogOpen(true);
      if (statusRef.current === "idle" || statusRef.current === "locked") {
        setStatus("prompt");
      }
    });
  }, [setStatus]);

  const handleAllowLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setStatus("unsupported");
      setLastErrorMessage(undefined);
      setDialogOpen(true);
      flushPending(null);
      return;
    }

    setStatus("requesting");
    setLastErrorMessage(undefined);

    const result = await requestCurrentPosition();
    if (result.ok) {
      const coords = { lat: result.lat, lng: result.lng };
      setCoordinates(coords);
      setStatus("ready");
      setDialogOpen(false);
      flushPending(coords);
      return;
    }

    setLastErrorMessage(result.message);
    setStatus("locked");
    setDialogOpen(true);
    flushPending(null);
  }, [flushPending, setCoordinates, setStatus]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    const unlocked =
      statusRef.current === "ready" && coordinatesRef.current !== null;
    if (!open && !unlocked) return;
    setDialogOpen(open);
  }, []);

  const isLocationReady = status === "ready" && coordinates !== null;

  const dismissDisabled = !isLocationReady;

  const dialogMode: DialogRequestLocationMode =
    status === "ready" || status === "idle" ? "prompt" : status;

  const value = useMemo<GeolocationContextValue>(
    () => ({
      status,
      coordinates,
      coordinatesRef,
      lastErrorMessage,
      isLocationReady,
      acquireLocation,
    }),
    [
      status,
      coordinates,
      coordinatesRef,
      lastErrorMessage,
      isLocationReady,
      acquireLocation,
    ],
  );

  return (
    <GeolocationContext.Provider value={value}>
      {children}
      <DialogRequestLocation
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        dismissDisabled={dismissDisabled}
        lastErrorMessage={lastErrorMessage}
        onAllowLocation={handleAllowLocation}
      />
    </GeolocationContext.Provider>
  );
}

export function useGeolocation(): GeolocationContextValue {
  const ctx = useContext(GeolocationContext);
  if (!ctx) {
    throw new Error("useGeolocation must be used within GeolocationProvider");
  }
  return ctx;
}
