import { isAxiosError } from "axios";

import { getLogs } from "@/api/generated/logs/logs";
import type { ApplicationLogItemResponse } from "@/api/generated/model/applicationLogItemResponse";
import type { GetApplicationLogsApiLogsGetParams } from "@/api/generated/model/getApplicationLogsApiLogsGetParams";
import type { GetJobLogsApiLogsJobGetParams } from "@/api/generated/model/getJobLogsApiLogsJobGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { JobLogItemResponse } from "@/api/generated/model/jobLogItemResponse";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";

export type LogLevelKey = "info" | "warn" | "error";

export type ApplicationLogRow = ApplicationLogItemResponse & {
  levelKey: LogLevelKey;
};

export type JobLogRow = JobLogItemResponse;

export type ApplicationLogsListParams = Pick<
  GetApplicationLogsApiLogsGetParams,
  | "page"
  | "per_page"
  | "search"
  | "sort_by"
  | "sort_dir"
  | "date_field"
  | "date_from"
  | "date_to"
  | "level"
  | "source"
>;

export type JobLogsListParams = Pick<
  GetJobLogsApiLogsJobGetParams,
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

export function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function normalizeLogLevel(level: string): LogLevelKey {
  const key = level.trim().toLowerCase();
  if (key === "warn" || key === "warning") return "warn";
  if (key === "error") return "error";
  return "info";
}

export function mapApplicationLogItem(
  row: ApplicationLogItemResponse,
): ApplicationLogRow {
  return {
    ...row,
    levelKey: normalizeLogLevel(row.level),
  };
}

export function logsApiErrorMessage(err: unknown, fallback: string): string {
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
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

export async function fetchApplicationLogsPage(
  params: ApplicationLogsListParams,
  request?: { signal?: AbortSignal },
): Promise<{ data: ApplicationLogRow[]; total: number }> {
  const api = getLogs();
  const res = await api.getApplicationLogsApiLogsGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "created_at",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? "created_at",
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      level: params.level ?? null,
      source: params.source ?? null,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return {
    data: res.data.map(mapApplicationLogItem),
    total: res.total,
  };
}

export async function fetchJobLogsPage(
  params: JobLogsListParams,
  request?: { signal?: AbortSignal },
): Promise<{ data: JobLogRow[]; total: number }> {
  const api = getLogs();
  const res = await api.getJobLogsApiLogsJobGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "created_at",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? "created_at",
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      status: params.status ?? null,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return {
    data: res.data,
    total: res.total,
  };
}
