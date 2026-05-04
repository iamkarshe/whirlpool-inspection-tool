import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { GetWarehousesApiWarehousesGetParams } from "@/api/generated/model/getWarehousesApiWarehousesGetParams";
import type { WarehouseCreateRequest } from "@/api/generated/model/warehouseCreateRequest";
import type { WarehouseDeviceResponse } from "@/api/generated/model/warehouseDeviceResponse";
import type { WarehouseInfoResponse } from "@/api/generated/model/warehouseInfoResponse";
import type { InspectionListResponse } from "@/api/generated/model/inspectionListResponse";
import type { WarehouseListResponse } from "@/api/generated/model/warehouseListResponse";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import type { WarehouseUserResponse } from "@/api/generated/model/warehouseUserResponse";
import { getInspections } from "@/api/generated/inspections/inspections";
import { getWarehouses } from "@/api/generated/warehouses/warehouses";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import { isAxiosError } from "axios";

export type WarehousesListParams = Pick<
  GetWarehousesApiWarehousesGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to" | "is_active"
>;

export type WarehouseInspectionsListParams = {
  warehouse_uuid: string;
  page?: number;
  per_page?: number;
  search?: string | null;
  sort_by?: string | null;
  sort_dir?: string;
  inspection_type?: string | null;
  is_active?: boolean;
  date_field?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};

export type WarehouseStats = {
  total_inspections: number;
  devices_count: number;
  users_count: number;
  inbound_total: number;
  inbound_in_review: number;
  inbound_approved: number;
  inbound_rejected: number;
  outbound_total: number;
  outbound_in_review: number;
  outbound_approved: number;
  outbound_rejected: number;
};

export type WarehouseResponseWithStats = WarehouseResponse & {
  stats?: WarehouseStats;
};

export type WarehouseInfoViewData = {
  warehouse: WarehouseResponseWithStats;
  users: WarehouseUserResponse[];
  devices: WarehouseDeviceResponse[];
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeWarehouseInfo(raw: unknown): WarehouseInfoViewData {
  if (!isObjectRecord(raw)) {
    throw new Error("Invalid warehouse response.");
  }
  if ("warehouse" in raw) {
    const wrapped = raw as unknown as WarehouseInfoResponse;
    return {
      warehouse: wrapped.warehouse as WarehouseResponseWithStats,
      users: wrapped.users ?? [],
      devices: wrapped.devices ?? [],
    };
  }
  return {
    warehouse: raw as unknown as WarehouseResponseWithStats,
    users: [],
    devices: [],
  };
}

export async function fetchWarehousesPage(
  params: WarehousesListParams,
  request?: { signal?: AbortSignal },
): Promise<WarehouseListResponse> {
  const api = getWarehouses();
  return api.getWarehousesApiWarehousesGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "id",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      is_active: params.is_active,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchWarehouseInfo(
  warehouseUuid: string,
  request?: { signal?: AbortSignal },
): Promise<WarehouseInfoViewData> {
  const api = getWarehouses();
  const response = await api.getWarehouseInfoApiWarehousesWarehouseUuidGet(
    warehouseUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
  return normalizeWarehouseInfo(response);
}

export async function fetchWarehouseInspectionsPage(
  params: WarehouseInspectionsListParams,
  request?: { signal?: AbortSignal },
): Promise<InspectionListResponse> {
  const api = getInspections();
  return api.getInspectionsApiInspectionsGet(
    {
      warehouse_uuid: params.warehouse_uuid,
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "created_at",
      sort_dir: params.sort_dir ?? "desc",
      inspection_type: params.inspection_type ?? null,
      is_active: params.is_active,
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function createWarehouse(
  payload: WarehouseCreateRequest,
  request?: { signal?: AbortSignal },
): Promise<WarehouseResponse> {
  const api = getWarehouses();
  return api.createWarehouseApiWarehousesPost(
    payload,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function uploadWarehousesCsv(
  file: File,
  signal?: AbortSignal,
): Promise<unknown> {
  const api = getWarehouses();
  return api.uploadWarehousesCsvApiWarehousesCsvUploadPost(
    { file },
    signal ? { signal } : undefined,
  );
}

export async function fetchAllWarehouses(
  request?: { signal?: AbortSignal },
): Promise<WarehouseResponse[]> {
  const api = getWarehouses();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const rows: WarehouseResponse[] = [];
  while (page <= totalPages) {
    const res = await api.getWarehousesApiWarehousesGet(
      { page, per_page: perPage, sort_by: "id", sort_dir: "desc" },
      request?.signal ? { signal: request.signal } : undefined,
    );
    rows.push(...res.data);
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }
  return rows;
}

export function warehouseApiErrorMessage(err: unknown, fallback: string): string {
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
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return fallback;
}
