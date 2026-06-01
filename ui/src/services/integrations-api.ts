import { isAxiosError } from "axios";

import { customInstance } from "@/api/axios-instance";
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

export async function testSmtpConnection(
  body: SmtpTestConnectionRequest,
  opts?: { signal?: AbortSignal },
): Promise<SmtpTestConnectionResponse> {
  const api = getAppIntegration();
  return api.testSmtpConnectionApiIntegrationsSmtpTestConnectionPost(
    body,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export async function testAwsS3Connection(opts?: {
  signal?: AbortSignal;
}): Promise<AwsS3TestConnectionResponse> {
  return customInstance<AwsS3TestConnectionResponse>(
    {
      url: "/api/integrations/aws-s3/test-connection",
      method: "POST",
    },
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export function integrationsApiErrorMessage(
  err: unknown,
  fallback: string,
): string {
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
