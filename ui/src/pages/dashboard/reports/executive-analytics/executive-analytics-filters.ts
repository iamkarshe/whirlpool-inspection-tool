import { getReports } from "@/api/generated/reports/reports";
import type { DamageGrading } from "@/api/generated/model/damageGrading";
import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";
import type { OperationsAnalyticsRequest } from "@/api/generated/model/operationsAnalyticsRequest";
import type { ReportsDropdownOption } from "@/api/generated/model/reportsDropdownOption";
import type {
  MultiSelectFilterSection,
  MultiSelectFiltersValue,
} from "@/components/filters/multi-select-filters-dialog";

export type ExecutiveAnalyticsFilters = {
  warehouseIds?: string[];
  plantIds?: string[];
  productCategoryKeys?: string[];
  /** DGR, LDGR, or SCRAP — API accepts a single grading. */
  grading?: string | null;
};

function mapDropdownOptions(options: ReportsDropdownOption[]) {
  return options.map((o) => ({ id: o.value, label: o.label }));
}

export async function fetchExecutiveKpiParameters(): Promise<KpiParametersResponse> {
  const reports = getReports();
  return reports.getKpiParametersApiReportsKpiParametersGet();
}

export function mapKpiParametersToFilterSections(
  params: KpiParametersResponse,
): MultiSelectFilterSection[] {
  return [
    {
      key: "warehouseIds",
      label: "Warehouse",
      options: mapDropdownOptions(params.warehouses),
    },
    {
      key: "plantIds",
      label: "Plant (inbound only)",
      options: mapDropdownOptions(params.plants),
    },
    {
      key: "productCategoryKeys",
      label: "Product category",
      options: mapDropdownOptions(params.product_category),
    },
    {
      key: "grading",
      label: "Damage grading",
      options: mapDropdownOptions(params.gradings),
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

/** Maps UI filter state to the shared report analytics request body. */
export function buildExecutiveAnalyticsRequest(
  filters: ExecutiveAnalyticsFilters,
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

  return {
    warehouse,
    plant,
    product_category,
    grading,
  };
}
