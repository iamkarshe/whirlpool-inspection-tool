import { apiClient } from "@/api/axios-instance";
import type { VersionResponse } from "@/api/generated/model/versionResponse";
import { isAxiosError } from "axios";

/**
 * GET /version — not in Orval output (see orval.transformer.ts).
 * Used for VPN / corporate IP allowlisting before login.
 */
export async function fetchAppVersion(): Promise<VersionResponse> {
  const { data } = await apiClient.get<VersionResponse>("/version");
  return data;
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
