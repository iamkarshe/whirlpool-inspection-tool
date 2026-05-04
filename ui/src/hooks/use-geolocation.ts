import { useContext } from "react";

import {
  GeolocationContext,
  type GeolocationContextValue,
} from "@/contexts/geolocation-context";

export function useGeolocation(): GeolocationContextValue {
  const ctx = useContext(GeolocationContext);
  if (!ctx) {
    throw new Error("useGeolocation must be used within GeolocationProvider");
  }
  return ctx;
}
