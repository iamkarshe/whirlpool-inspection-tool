import { isAxiosError } from "axios";

import { getLogins } from "@/api/generated/logins/logins";
import type { GetLoginIpSummaryApiLoginsIpSummaryGetParams } from "@/api/generated/model/getLoginIpSummaryApiLoginsIpSummaryGetParams";
import type { GetLoginsApiLoginsGetParams } from "@/api/generated/model/getLoginsApiLoginsGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { LoginDetailResponse } from "@/api/generated/model/loginDetailResponse";
import type { LoginIpDetailResponse } from "@/api/generated/model/loginIpDetailResponse";
import type { LoginListItemResponse } from "@/api/generated/model/loginListItemResponse";
import type { LoginKpiResponse } from "@/api/generated/model/loginKpiResponse";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import type {
  LoginActivity,
  LoginIpSummaryRow,
  LoginKpis,
} from "@/pages/dashboard/admin/logins/login-types";

export type LoginsListParams = Pick<
  GetLoginsApiLoginsGetParams,
  | "page"
  | "per_page"
  | "search"
  | "sort_by"
  | "sort_dir"
  | "date_field"
  | "date_from"
  | "date_to"
  | "status"
>;

export type LoginIpSummaryListParams = Pick<
  GetLoginIpSummaryApiLoginsIpSummaryGetParams,
  | "page"
  | "per_page"
  | "search"
  | "sort_by"
  | "sort_dir"
  | "date_field"
  | "date_from"
  | "date_to"
  | "abusive_only"
>;

function rowSuccess(status: string): boolean {
  return status.toLowerCase() === "successful";
}

export function mapLoginListItem(row: LoginListItemResponse): LoginActivity {
  return {
    id: row.id,
    uuid: row.uuid,
    reference_id: row.reference_id,
    user_name: row.user_name,
    email: row.email ?? "",
    attempted_email: row.attempted_email,
    login_method: row.login_method,
    failure_reason: row.failure_reason,
    logged_at: row.logged_at,
    ip_address: row.ip_address ?? "",
    proxy_ip_address: row.proxy_ip_address,
    ip_metadata: row.ip_metadata,
    external_links: row.external_links,
    device_info: row.device_source ?? "",
    status: row.status,
    success: rowSuccess(row.status),
  };
}

function kpiToCards(k: LoginKpiResponse): LoginKpis {
  return {
    totalLogins: k.total,
    successfulLogins: k.successful,
    failedLogins: k.failed,
    uniqueUsers: k.unique_users,
  };
}

export async function fetchLoginsPage(
  params: LoginsListParams,
  request?: { signal?: AbortSignal },
): Promise<{ data: LoginActivity[]; total: number }> {
  const api = getLogins();
  const res = await api.getLoginsApiLoginsGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "id",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      status: params.status ?? null,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return {
    data: res.data.map(mapLoginListItem),
    total: res.total,
  };
}

export async function fetchLoginKpis(request?: {
  signal?: AbortSignal;
}): Promise<LoginKpis> {
  const api = getLogins();
  const res = await api.getLoginsKpiApiLoginsKpiGet(
    request?.signal ? { signal: request.signal } : undefined,
  );
  return kpiToCards(res);
}

export async function fetchLoginDetail(
  logUuid: string,
  request?: { signal?: AbortSignal },
): Promise<LoginDetailResponse> {
  const api = getLogins();
  return api.getLoginDetailApiLoginsLogUuidGet(
    logUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchLoginIpDetail(
  ipAddress: string,
  request?: { signal?: AbortSignal; refresh_metadata?: boolean },
): Promise<LoginIpDetailResponse> {
  const ip = ipAddress.trim();
  if (!ip) throw new Error("IP address is required.");
  const api = getLogins();
  return api.getLoginIpDetailApiLoginsIpIpAddressGet(
    ip,
    request?.refresh_metadata ? { refresh_metadata: true } : undefined,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchLoginIpSummaryPage(
  params: LoginIpSummaryListParams,
  request?: { signal?: AbortSignal },
): Promise<{ data: LoginIpSummaryRow[]; total: number }> {
  const api = getLogins();
  const res = await api.getLoginIpSummaryApiLoginsIpSummaryGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "last_seen_at",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      abusive_only: params.abusive_only ?? false,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return { data: res.data, total: res.total };
}

export async function fetchLoginsByUserHints(
  hints: { email?: string | null; name?: string },
  request?: { signal?: AbortSignal },
): Promise<LoginActivity[]> {
  const search = hints.email?.trim() || hints.name?.trim() || null;
  if (!search) return [];
  const { data } = await fetchLoginsPage(
    { page: 1, per_page: 100, search, sort_by: "id", sort_dir: "desc" },
    request,
  );
  return data;
}

export function loginApiErrorMessage(err: unknown, fallback: string): string {
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

export function stringifyLoginDeviceInfo(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
