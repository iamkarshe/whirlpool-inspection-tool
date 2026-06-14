import { isAxiosError } from "axios";

import { getApp } from "@/api/generated/app/app";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { ReleaseNoteResponse } from "@/api/generated/model/releaseNoteResponse";

export type ReleaseNoteRow = ReleaseNoteResponse;

let releaseNotesMemoryCache: ReleaseNoteRow[] | null = null;
let releaseNotesInflight: Promise<ReleaseNoteRow[]> | null = null;

export function clearReleaseNotesCache(): void {
  releaseNotesMemoryCache = null;
  releaseNotesInflight = null;
}

export function releaseNotesApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail: unknown }).detail === "string"
  ) {
    const detail = (data as { detail: string }).detail;
    if (detail.length > 0) return detail;
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray((data as HTTPValidationError).detail)
  ) {
    const detail = (data as HTTPValidationError).detail!;
    const first = detail[0]?.msg ?? detail[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  if (typeof err.response?.status === "number") {
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

async function fetchReleaseNotesUncached(
  request?: { signal?: AbortSignal },
): Promise<ReleaseNoteRow[]> {
  const api = getApp();
  const response = await api.getReleaseNotesApiReleaseNotesGet(
    request?.signal ? { signal: request.signal } : undefined,
  );
  return response.notes ?? [];
}

/** Dedupes in-flight calls and caches for the session (StrictMode-safe in dev). */
export async function fetchReleaseNotes(
  request?: { signal?: AbortSignal; force?: boolean },
): Promise<ReleaseNoteRow[]> {
  if (request?.force) {
    clearReleaseNotesCache();
  }

  if (releaseNotesMemoryCache) {
    return releaseNotesMemoryCache;
  }

  if (releaseNotesInflight) {
    return releaseNotesInflight;
  }

  releaseNotesInflight = fetchReleaseNotesUncached(request)
    .then((notes) => {
      releaseNotesMemoryCache = notes;
      return notes;
    })
    .finally(() => {
      releaseNotesInflight = null;
    });

  return releaseNotesInflight;
}
