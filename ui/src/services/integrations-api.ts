import { isAxiosError } from "axios";

import {
  SafeApiRequestError,
  safeApiRequest,
} from "@/api/axios-instance";
import { getAppIntegration } from "@/api/generated/app-integration/app-integration";
import type { AwsS3TestConnectionResponse } from "@/api/generated/model/awsS3TestConnectionResponse";
import type { AwsS3UpdateRequest } from "@/api/generated/model/awsS3UpdateRequest";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { IntegrationCredentialsResponse } from "@/api/generated/model/integrationCredentialsResponse";
import type { OktaSsoUpdateRequest } from "@/api/generated/model/oktaSsoUpdateRequest";
import type { SmtpTestConnectionRequest } from "@/api/generated/model/smtpTestConnectionRequest";
import type { SmtpTestConnectionResponse } from "@/api/generated/model/smtpTestConnectionResponse";
import type { SmtpUpdateRequest } from "@/api/generated/model/smtpUpdateRequest";

export async function fetchIntegrationsCredentials(
  opts?: { signal?: AbortSignal },
): Promise<IntegrationCredentialsResponse> {
  const api = getAppIntegration();
  return api.getIntegrationsApiIntegrationsGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function updateOktaSsoIntegration(
  body: OktaSsoUpdateRequest,
  opts?: { signal?: AbortSignal },
): Promise<IntegrationCredentialsResponse> {
  const api = getAppIntegration();
  return api.putOktaSsoIntegrationApiIntegrationsOktaSsoPut(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function updateAwsS3Integration(
  body: AwsS3UpdateRequest,
  opts?: { signal?: AbortSignal },
): Promise<IntegrationCredentialsResponse> {
  const api = getAppIntegration();
  return api.putAwsS3IntegrationApiIntegrationsAwsS3Put(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function updateSmtpIntegration(
  body: SmtpUpdateRequest,
  opts?: { signal?: AbortSignal },
): Promise<IntegrationCredentialsResponse> {
  const api = getAppIntegration();
  return api.putSmtpIntegrationApiIntegrationsSmtpPut(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

function throwSafeApiResult<T>(
  result: { ok: boolean; status: number; data: T },
  fallback: string,
): never {
  throw new SafeApiRequestError(
    integrationsApiErrorMessageFromBody(result.data, result.status, fallback),
    result.status,
    result.data,
  );
}

function integrationsApiErrorMessageFromBody(
  data: unknown,
  status: number,
  fallback: string,
): string {
  if (typeof data === "object" && data !== null) {
    if ("detail" in data) {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail.trim();
      }
      if (Array.isArray(detail)) {
        const first = (detail as HTTPValidationError["detail"])?.[0]?.msg ??
          (detail as HTTPValidationError["detail"])?.[0]?.type;
        if (typeof first === "string" && first.length > 0) return first;
      }
    }
    if (
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
    ) {
      const message = (data as { message: string }).message.trim();
      if (message.length > 0) return message;
    }
  }
  if (status > 0) return `${fallback} (HTTP ${status}).`;
  return fallback;
}

/**
 * SMTP test — uses safeApiRequest so connection/validation failures never
 * trigger the session-revoked logout interceptor (same idea as jobs-api fetch).
 */
export async function testSmtpConnection(
  body: SmtpTestConnectionRequest,
  opts?: { signal?: AbortSignal },
): Promise<SmtpTestConnectionResponse> {
  const result = await safeApiRequest<SmtpTestConnectionResponse>({
    url: "/api/integrations/smtp/test-connection",
    method: "POST",
    data: body,
    signal: opts?.signal,
  });
  if (!result.ok) {
    throwSafeApiResult(result, "Could not send test email.");
  }
  return result.data;
}

/**
 * AWS S3 test — same safe handler as SMTP (no logout on diagnostic 401/4xx).
 */
export async function testAwsS3Connection(opts?: {
  signal?: AbortSignal;
}): Promise<AwsS3TestConnectionResponse> {
  const result = await safeApiRequest<AwsS3TestConnectionResponse>({
    url: "/api/integrations/aws-s3/test-connection",
    method: "POST",
    signal: opts?.signal,
  });
  if (!result.ok) {
    throwSafeApiResult(result, "Could not test AWS S3 connection.");
  }
  return result.data;
}

export function integrationsApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof SafeApiRequestError) return err.message;
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
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
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0)
    return err.message;
  return fallback;
}
