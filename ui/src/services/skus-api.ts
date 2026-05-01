import { isAxiosError } from "axios";

import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import { getSkus } from "@/api/generated/skus/skus";

export function uploadSkusCsv(
  file: File,
  signal?: AbortSignal,
): Promise<unknown> {
  const api = getSkus();
  return api.uploadSkusCsvApiSkusCsvUploadPost(
    { file },
    signal ? { signal } : undefined,
  );
}

export function uploadSkusCsvErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : "Could not upload the CSV.";
  }
  const data = err.response?.data as unknown;
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
    return `Upload failed (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0)
    return err.message;
  return "Could not upload the CSV.";
}
