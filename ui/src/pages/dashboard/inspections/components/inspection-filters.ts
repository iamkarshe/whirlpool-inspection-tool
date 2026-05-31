import type { ReportsDropdownOption } from "@/api/generated/model/reportsDropdownOption";
import type {
  Inspection,
  InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";
import { getInspectionQuestionResults } from "@/pages/dashboard/inspections/inspection-service";
import { loadInspectionFilterOptionsCached } from "@/pages/dashboard/inspections/components/inspection-filter-options-cache";
import type {
  InspectionFilterContext,
  InspectionFilterOption,
  InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filter-options-types";
import { fetchExecutiveKpiParameters } from "@/pages/dashboard/reports/executive-analytics/executive-analytics-filters";
import { deriveIsUnderReviewFromReviewStatus } from "@/services/inspections-api";
import { fetchAllUsers } from "@/services/users-api";
import type {
  MultiSelectFilterSection,
  MultiSelectFiltersValue,
} from "@/components/filters/multi-select-filters-dialog";

export type {
  InspectionFilterContext,
  InspectionFilterOption,
  InspectionFilterOptionsSource,
} from "@/pages/dashboard/inspections/components/inspection-filter-options-types";

export type InspectionStatusFilter = "pass" | "fail" | "under_review";

export type InspectionStatusMap = Record<string, InspectionStatusFilter>;

const TYPE_BOTH_ID = "both";

const INSPECTION_TYPE_OPTIONS: InspectionFilterOption[] = [
  { id: TYPE_BOTH_ID, label: "Both" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
];

export function defaultInspectionFilters(): MultiSelectFiltersValue {
  return {
    type: [TYPE_BOTH_ID],
    status: [],
    warehouse: [],
    product_category: [],
    inspector: [],
  };
}

/** Default filter chips for flagged inspection lists (failed checklist). */
export function defaultFlaggedInspectionFilters(): MultiSelectFiltersValue {
  return {
    ...defaultInspectionFilters(),
    status: ["fail"],
  };
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
  next.status = parseCsvParam(params, "status");
  next.warehouse = parseCsvParam(params, "warehouse");
  next.inspector = parseCsvParam(params, "inspector");
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

function mergeOptionsById(
  ...groups: InspectionFilterOption[][]
): InspectionFilterOption[] {
  const map = new Map<string, InspectionFilterOption>();
  for (const group of groups) {
    for (const option of group) {
      if (option.id) map.set(option.id, option);
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function mapDropdownOptions(
  options: ReportsDropdownOption[],
): InspectionFilterOption[] {
  return options.map((o) => ({ id: o.value, label: o.label }));
}

/** KPI warehouse labels are `{code} - {name}`; list rows use `warehouse_code`. */
export function buildWarehouseCodeById(
  warehouses: ReportsDropdownOption[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of warehouses) {
    if (!w.value) continue;
    const label = w.label.trim();
    const sep = label.indexOf(" - ");
    out[w.value] = sep >= 0 ? label.slice(0, sep).trim() : label;
  }
  return out;
}

function buildProductCategoryLabelByPairKey(
  options: ReportsDropdownOption[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const option of options) {
    if (option.value) out[option.value] = option.label;
  }
  return out;
}

function optionsFromInspections(inspections: Inspection[]): {
  users: InspectionFilterOption[];
} {
  const users = Array.from(
    new Set(inspections.map((i) => i.inspector_name).filter(Boolean)),
  )
    .sort()
    .map((name) => ({ id: name, label: name }));

  return { users };
}

async function fetchInspectionFilterOptionsFromApi(opts?: {
  signal?: AbortSignal;
}): Promise<InspectionFilterOptionsSource> {
  const signal = opts?.signal;
  const [kpiParameters, users] = await Promise.all([
    fetchExecutiveKpiParameters({ signal }),
    fetchAllUsers({ signal }),
  ]);

  const userOptions = users
    .filter((u) => u.is_active)
    .map((u) => ({
      id: u.name,
      label: u.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    kpiParameters,
    warehouseCodeById: buildWarehouseCodeById(kpiParameters.warehouses),
    productCategoryLabelByPairKey: buildProductCategoryLabelByPairKey(
      kpiParameters.product_category,
    ),
    users: userOptions,
  };
}

/** Loads KPI + user filter metadata; cached in-session until logout. */
export async function loadInspectionFilterOptions(opts?: {
  signal?: AbortSignal;
}): Promise<InspectionFilterOptionsSource> {
  return loadInspectionFilterOptionsCached(
    fetchInspectionFilterOptionsFromApi,
    opts,
  );
}

export function buildInspectionFilterContext(
  source: InspectionFilterOptionsSource,
): InspectionFilterContext {
  return {
    warehouseCodeById: source.warehouseCodeById,
    productCategoryLabelByPairKey: source.productCategoryLabelByPairKey,
  };
}

export function buildInspectionFilterSections(
  source: InspectionFilterOptionsSource,
  inspections: Inspection[] = [],
): MultiSelectFilterSection[] {
  const fromRows = optionsFromInspections(inspections);

  const warehouseOptions = mapDropdownOptions(source.kpiParameters.warehouses);
  const categoryOptions = mapDropdownOptions(
    source.kpiParameters.product_category,
  );
  const userOptions = mergeOptionsById(source.users, fromRows.users);

  return [
    { key: "type", label: "Type", options: INSPECTION_TYPE_OPTIONS },
    { key: "warehouse", label: "Warehouse", options: warehouseOptions },
    {
      key: "product_category",
      label: "Product category",
      options: categoryOptions,
    },
    { key: "inspector", label: "User", options: userOptions },
    {
      key: "status",
      label: "Status",
      options: [
        { id: "pass", label: "Pass" },
        { id: "fail", label: "Failed" },
        { id: "under_review", label: "Under review" },
      ],
    },
  ];
}

function hasAnyFailed(rows: InspectionQuestionResult[]) {
  return rows.some((r) => r.status === "fail");
}

export async function computeInspectionStatusMap(
  inspections: Inspection[],
): Promise<InspectionStatusMap> {
  const entries = await Promise.all(
    inspections.map(async (i) => {
      if (i.is_under_review || deriveIsUnderReviewFromReviewStatus(i.review_status ?? "")) {
        return [i.id, "under_review" as const] as const;
      }
      if (i.checklist_quality) {
        return [i.id, i.checklist_quality] as const;
      }
      const [outer, inner, product] = await Promise.all([
        getInspectionQuestionResults(i.id, "outer-packaging"),
        getInspectionQuestionResults(i.id, "inner-packaging"),
        getInspectionQuestionResults(i.id, "product"),
      ]);
      const failed = [outer, inner, product].some(hasAnyFailed);
      return [i.id, failed ? ("fail" as const) : ("pass" as const)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function resolveInspectionStatusFilter(
  inspection: Inspection,
  statusMap: InspectionStatusMap | null,
): InspectionStatusFilter | null {
  if (
    inspection.is_under_review ||
    deriveIsUnderReviewFromReviewStatus(inspection.review_status ?? "")
  ) {
    return "under_review";
  }
  const mapped = statusMap?.[inspection.id];
  if (mapped === "pass" || mapped === "fail") return mapped;
  if (inspection.checklist_quality === "pass" || inspection.checklist_quality === "fail") {
    return inspection.checklist_quality;
  }
  return null;
}

function resolveInspectionProductCategoryPair(
  inspection: Inspection,
  labelByPairKey: Record<string, string>,
): string | null {
  const explicit = inspection.product_category_pair?.trim();
  if (explicit) return explicit;

  const categoryType = inspection.product_category_type?.trim();
  const subCategory = inspection.product_category_sub_category?.trim();
  if (categoryType && subCategory) {
    return `${categoryType}|${subCategory}`;
  }

  const name = inspection.product_category_name?.trim();
  if (name) {
    for (const [pair, label] of Object.entries(labelByPairKey)) {
      if (label === name) return pair;
    }
  }

  return null;
}

export function applyInspectionFilters(
  inspections: Inspection[],
  value: MultiSelectFiltersValue,
  statusMap: InspectionStatusMap | null,
  context?: InspectionFilterContext,
): Inspection[] {
  const types = value.type ?? [];
  const typeSet = new Set(types);
  const filterByType =
    types.length > 0 && !typeSet.has(TYPE_BOTH_ID);
  const allowedTypes = new Set(
    types.filter((t) => t !== TYPE_BOTH_ID),
  );

  const statuses = new Set(value.status ?? []);
  const warehouseIds = new Set(value.warehouse ?? []);
  const inspectors = new Set(value.inspector ?? []);
  const categoryPairs = new Set(value.product_category ?? []);

  const warehouseCodes = new Set<string>();
  if (warehouseIds.size > 0 && context?.warehouseCodeById) {
    for (const id of warehouseIds) {
      const code = context.warehouseCodeById[id];
      if (code) warehouseCodes.add(code);
    }
  }

  const labelByPairKey = context?.productCategoryLabelByPairKey ?? {};

  return inspections.filter((i) => {
    if (filterByType) {
      if (allowedTypes.size === 0) return false;
      if (!allowedTypes.has(i.inspection_type)) return false;
    }

    if (categoryPairs.size > 0) {
      const pair = resolveInspectionProductCategoryPair(i, labelByPairKey);
      if (!pair || !categoryPairs.has(pair)) return false;
    }

    if (inspectors.size > 0 && !inspectors.has(i.inspector_name)) return false;

    if (warehouseCodes.size > 0) {
      const code = (i.warehouse_code ?? "").trim();
      if (!code || !warehouseCodes.has(code)) return false;
    }

    if (statuses.size > 0) {
      const bucket = resolveInspectionStatusFilter(i, statusMap);
      if (!bucket || !statuses.has(bucket)) return false;
    }

    return true;
  });
}
