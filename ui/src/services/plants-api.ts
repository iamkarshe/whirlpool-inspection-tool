import { isAxiosError } from "axios";
import { getInspections } from "@/api/generated/inspections/inspections";
import type { GetInspectionsApiInspectionsGetParams } from "@/api/generated/model/getInspectionsApiInspectionsGetParams";
import type { GetPlantsApiPlantsGetParams } from "@/api/generated/model/getPlantsApiPlantsGetParams";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { InspectionListResponse } from "@/api/generated/model/inspectionListResponse";
import type { PlantCreateRequest } from "@/api/generated/model/plantCreateRequest";
import type { PlantDeviceResponse } from "@/api/generated/model/plantDeviceResponse";
import type { PlantInfoResponse } from "@/api/generated/model/plantInfoResponse";
import type { PlantListResponse } from "@/api/generated/model/plantListResponse";
import type { PlantResponse } from "@/api/generated/model/plantResponse";
import type { PlantUserResponse } from "@/api/generated/model/plantUserResponse";
import { getPlants } from "@/api/generated/plants/plants";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";

export type PlantsListParams = Pick<
  GetPlantsApiPlantsGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to" | "is_active"
>;

export type PlantInspectionsListParams = Pick<
  GetInspectionsApiInspectionsGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to" | "is_active" | "inspection_type"
> & {
  plant_uuid: string;
};

export type PlantInfoViewData = {
  plant: PlantResponse;
  users: PlantUserResponse[];
  devices: PlantDeviceResponse[];
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePlantInfo(raw: unknown): PlantInfoViewData {
  if (!isObjectRecord(raw)) {
    throw new Error("Invalid plant response.");
  }
  if ("plant" in raw) {
    const wrapped = raw as unknown as PlantInfoResponse;
    return {
      plant: wrapped.plant,
      users: wrapped.users ?? [],
      devices: wrapped.devices ?? [],
    };
  }
  return {
    plant: raw as unknown as PlantResponse,
    users: [],
    devices: [],
  };
}

export async function fetchPlantsPage(
  params: PlantsListParams,
  request?: { signal?: AbortSignal },
): Promise<PlantListResponse> {
  const api = getPlants();
  return api.getPlantsApiPlantsGet(
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

export async function fetchPlantInfo(
  plantUuid: string,
  request?: { signal?: AbortSignal },
): Promise<PlantInfoViewData> {
  const api = getPlants();
  const response = await api.getPlantInfoApiPlantsPlantUuidGet(
    plantUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
  return normalizePlantInfo(response);
}

export async function fetchPlantInspectionsPage(
  params: PlantInspectionsListParams,
  request?: { signal?: AbortSignal },
): Promise<InspectionListResponse> {
  const api = getInspections();
  return api.getInspectionsApiInspectionsGet(
    {
      plant_uuid: params.plant_uuid,
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

export async function createPlant(
  payload: PlantCreateRequest,
  request?: { signal?: AbortSignal },
): Promise<PlantResponse> {
  const api = getPlants();
  return api.createPlantApiPlantsPost(
    payload,
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function uploadPlantsCsv(
  file: File,
  signal?: AbortSignal,
): Promise<unknown> {
  const api = getPlants();
  return api.uploadPlantsCsvApiPlantsCsvUploadPost(
    { file },
    signal ? { signal } : undefined,
  );
}

export function plantsApiErrorMessage(err: unknown, fallback: string): string {
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
