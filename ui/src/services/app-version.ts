import { apiClient } from "@/api/axios-instance";
import type { VersionResponse } from "@/api/generated/model/versionResponse";
import { isAxiosError } from "axios";

/**
 * GET /version — not in Orval output (see orval.transformer.ts).
 * Used for VPN / corporate IP allowlisting before login.
 */
let inFlightVersionRequest: Promise<VersionResponse> | null = null;

export async function fetchAppVersion(options?: {
  force?: boolean;
}): Promise<VersionResponse> {
  if (options?.force) {
    inFlightVersionRequest = null;
  }

  if (inFlightVersionRequest) {
    return inFlightVersionRequest;
  }

  const request = apiClient
    .get<VersionResponse>("/version")
    .then((response) => response.data)
    .catch((err) => {
      if (inFlightVersionRequest === request) {
        inFlightVersionRequest = null;
      }
      throw err;
    });

  inFlightVersionRequest = request;

  void request.finally(() => {
    if (inFlightVersionRequest === request) {
      inFlightVersionRequest = null;
    }
  });

  return request;
}

export function normalizeVersionCheckError(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error
      ? err.message
      : "Could not verify app access. Try again.";
  }
  const status = err.response?.status;
  if (status) {
    return `Could not verify app access (HTTP ${status}).`;
  }
  return "Could not reach the server. Check your network or VPN, then try again.";
}
