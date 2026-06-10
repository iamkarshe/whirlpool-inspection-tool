import type { JobExecutionResponse } from "@/api/generated/model/jobExecutionResponse";
import { getApiBaseUrl } from "@/api/axios-instance";

const AUTO_APPROVE_INSPECTIONS_PATH = "/jobs/auto-approve-inspections";

export class JobApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JobApiError";
    this.status = status;
  }
}

function parseJobApiErrorBody(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    if ("detail" in body) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.length > 0) return detail;
      if (Array.isArray(detail)) {
        const first = detail[0]?.msg ?? detail[0]?.type;
        if (typeof first === "string" && first.length > 0) return first;
      }
    }
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  }

  if (status === 401) return "Invalid or missing job access token.";
  if (status === 503) return "JOB_EXECUTE_TOKEN is not configured on the server.";
  return `Request failed (HTTP ${status}).`;
}

/**
 * Runs the auto-approve job via `fetch`, outside the shared axios client, so a
 * job-token 401 does not trigger the session-revoked logout interceptor.
 *
 * Same pattern as `safeApiRequest` / `criticalAdminDeleteRequest` in
 * `axios-instance.ts` and integration test helpers in `integrations-api.ts`.
 */
export async function runAutoApproveInspectionsJob(
  jobExecuteToken: string,
  options?: { signal?: AbortSignal },
): Promise<JobExecutionResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new JobApiError("API base URL is not configured.");
  }

  const url = `${baseUrl}${AUTO_APPROVE_INSPECTIONS_PATH}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-job-execute-token": jobExecuteToken,
      },
      signal: options?.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Network request failed.";
    throw new JobApiError(message);
  }

  let body: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new JobApiError(
      parseJobApiErrorBody(body, response.status),
      response.status,
    );
  }

  if (!body || typeof body !== "object") {
    throw new JobApiError("Unexpected empty response from job endpoint.");
  }

  return body as JobExecutionResponse;
}

export function jobApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof JobApiError) return err.message;
  if (err instanceof Error && err.message.length > 0) return err.message;
  return fallback;
}
