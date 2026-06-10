import type { DamageGrading } from "@/api/generated/model/damageGrading";
import type { InspectionType } from "@/api/generated/model/inspectionType";
import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";
import type { OperationsAnalyticsRequest } from "@/api/generated/model/operationsAnalyticsRequest";
import {
  fetchKpiParameters,
  mapKpiDropdownOptions,
} from "@/services/kpi-parameters-api";
import type {
  MultiSelectFilterSection,
  MultiSelectFiltersValue,
} from "@/components/filters/multi-select-filters-dialog";
import { formatCalendarDateForApi } from "@/services/inspections-api";
import type { DateRange } from "react-day-picker";

export type ExecutiveAnalyticsFilters = {
  warehouseIds?: string[];
  plantIds?: string[];
  productCategoryKeys?: string[];
  /** DGR, LDGR, or SCRAP — API accepts a single grading. */
  grading?: string | null;
};

export async function fetchExecutiveKpiParameters(opts?: {
  signal?: AbortSignal;
}): Promise<KpiParametersResponse> {
  return fetchKpiParameters(opts);
}

export function mapKpiParametersToFilterSections(
  params: KpiParametersResponse,
): MultiSelectFilterSection[] {
  return [
    {
      key: "warehouseIds",
      label: "Warehouse",
      options: mapKpiDropdownOptions(params.warehouses),
    },
    {
      key: "plantIds",
      label: "Plant (inbound only)",
      options: mapKpiDropdownOptions(params.plants),
    },
    {
      key: "productCategoryKeys",
      label: "Product category",
      options: mapKpiDropdownOptions(params.product_category),
    },
    {
      key: "grading",
      label: "Damage grading",
      options: mapKpiDropdownOptions(params.gradings),
    },
  ];
}

export function executiveFiltersToDialogValue(
  filters: ExecutiveAnalyticsFilters,
): MultiSelectFiltersValue {
  return {
    warehouseIds: filters.warehouseIds ?? [],
    plantIds: filters.plantIds ?? [],
    productCategoryKeys: filters.productCategoryKeys ?? [],
    grading: filters.grading ? [filters.grading] : [],
  };
}

export function dialogValueToExecutiveFilters(
  next: MultiSelectFiltersValue,
): ExecutiveAnalyticsFilters {
  const warehouseIds = (next.warehouseIds ?? []).map(String).filter(Boolean);
  const plantIds = (next.plantIds ?? []).map(String).filter(Boolean);
  const productCategoryKeys = (next.productCategoryKeys ?? [])
    .map(String)
    .filter(Boolean);
  const gradingSelected = (next.grading ?? []).map(String).filter(Boolean);
  const grading = gradingSelected[0] ?? null;

  const isEmpty =
    warehouseIds.length === 0 &&
    plantIds.length === 0 &&
    productCategoryKeys.length === 0 &&
    !grading;

  if (isEmpty) return {};

  return {
    warehouseIds: warehouseIds.length ? warehouseIds : undefined,
    plantIds: plantIds.length ? plantIds : undefined,
    productCategoryKeys: productCategoryKeys.length
      ? productCategoryKeys
      : undefined,
    grading,
  };
}

export type ExecutiveAnalyticsRequestOptions = {
  dateRange?: DateRange;
  inspectionType?: InspectionType;
};

/** Maps UI filter state to the shared report analytics request body. */
export function buildExecutiveAnalyticsRequest(
  filters: ExecutiveAnalyticsFilters,
  options?: ExecutiveAnalyticsRequestOptions,
): OperationsAnalyticsRequest {
  const warehouse = (filters.warehouseIds ?? [])
    .map((id) => Number.parseInt(id, 10))
    .filter((n) => Number.isFinite(n));
  const plant = (filters.plantIds ?? [])
    .map((id) => Number.parseInt(id, 10))
    .filter((n) => Number.isFinite(n));
  const product_category = filters.productCategoryKeys ?? [];
  const grading = filters.grading
    ? (filters.grading as DamageGrading)
    : null;

  const from = options?.dateRange?.from;
  const to = options?.dateRange?.to ?? from;

  return {
    warehouse,
    plant,
    product_category,
    grading,
    type: options?.inspectionType ?? null,
    date_from: from ? formatCalendarDateForApi(from) : null,
    date_to: to ? formatCalendarDateForApi(to) : null,
  };
}
