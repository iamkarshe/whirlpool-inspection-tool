import {
  normalizeInspectionFilterOptionsSource,
  type InspectionFilterOption,
  type InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filter-options-types";
import { loadInspectionFilterOptionsCached } from "@/pages/dashboard/inspections/components/inspection-filter-options-cache";
import {
  fetchKpiParameters,
  mapKpiDropdownOptions,
} from "@/services/kpi-parameters-api";
import type {
  MultiSelectFilterSection,
  MultiSelectFiltersValue,
} from "@/components/filters/multi-select-filters-dialog";

export type {
  InspectionFilterOption,
  InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filter-options-types";

const TYPE_BOTH_ID = "both";

const INSPECTION_TYPE_OPTIONS: InspectionFilterOption[] = [
  { id: TYPE_BOTH_ID, label: "Both" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
];

export function defaultInspectionFilters(): MultiSelectFiltersValue {
  return {
    type: [TYPE_BOTH_ID],
    warehouse: [],
    plant: [],
    user: [],
    product_category: [],
  };
}

/** Default filter chips for flagged inspection lists (failed checklist). */
export function defaultFlaggedInspectionFilters(): MultiSelectFiltersValue {
  return defaultInspectionFilters();
}

function parseCsvParam(params: URLSearchParams, key: string) {
  const raw = (params.get(key) ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseInspectionFiltersFromSearch(
  search: string,
): MultiSelectFiltersValue {
  const params = new URLSearchParams(search);
  const next = defaultInspectionFilters();
  next.type = parseCsvParam(params, "type");
  next.warehouse = parseCsvParam(params, "warehouse");
  next.plant = parseCsvParam(params, "plant");
  next.user = parseCsvParam(params, "user");
  next.product_category = parseCsvParam(params, "product_category");
  return next;
}

export function mergeInspectionFilters(
  base: MultiSelectFiltersValue,
  override: MultiSelectFiltersValue,
): MultiSelectFiltersValue {
  const out = { ...base };
  for (const k of Object.keys(out)) {
    const key = k as keyof MultiSelectFiltersValue;
    if ((override[key] ?? []).length > 0) out[key] = override[key];
  }
  return out;
}

async function fetchInspectionFilterOptionsFromApi(opts?: {
  signal?: AbortSignal;
}): Promise<InspectionFilterOptionsSource> {
  const params = await fetchKpiParameters(opts);
  return normalizeInspectionFilterOptionsSource({
    warehouses: mapKpiDropdownOptions(params.warehouses),
    plants: mapKpiDropdownOptions(params.plants),
    users: mapKpiDropdownOptions(params.users),
    productCategories: mapKpiDropdownOptions(params.product_category),
  });
}

/** Loads filter metadata from `GET /api/reports/kpi-parameters` (one request). */
export async function loadInspectionFilterOptions(opts?: {
  signal?: AbortSignal;
}): Promise<InspectionFilterOptionsSource> {
  return loadInspectionFilterOptionsCached(
    fetchInspectionFilterOptionsFromApi,
    opts,
  );
}

export type BuildInspectionFilterSectionsOptions = {
  /** When true, includes inspector options from kpi-parameters `users`. */
  hasUser?: boolean;
};

export function buildInspectionFilterSections(
  source: InspectionFilterOptionsSource,
  options?: BuildInspectionFilterSectionsOptions,
): MultiSelectFilterSection[] {
  const normalized = normalizeInspectionFilterOptionsSource(source);
  const sections: MultiSelectFilterSection[] = [
    { key: "type", label: "Type", options: INSPECTION_TYPE_OPTIONS },
    { key: "warehouse", label: "Warehouse", options: normalized.warehouses },
    {
      key: "plant",
      label: "Plant (inbound only)",
      options: normalized.plants,
    },
    {
      key: "product_category",
      label: "Product category",
      options: normalized.productCategories,
    },
  ];

  if (options?.hasUser) {
    sections.push({
      key: "user",
      label: "Inspector",
      options: normalized.users,
    });
  }

  return sections;
}

export { TYPE_BOTH_ID };
