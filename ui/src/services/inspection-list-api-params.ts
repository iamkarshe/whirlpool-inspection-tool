import type { GetInspectionsApiInspectionsGetInspectionType } from "@/api/generated/model/getInspectionsApiInspectionsGetInspectionType";
import type { GetInspectionKpisApiInspectionsKpisGetPeriod } from "@/api/generated/model/getInspectionKpisApiInspectionsKpisGetPeriod";

/**
 * List/KPI filter params aligned with `GET /api/reports/kpi-parameters` values.
 * Detail/view routes continue to use UUIDs in paths — see `feature/api-fix.md`.
 *
 * Until OpenAPI is regenerated, the UI calls these query keys via `customInstance`
 * (not the stale `warehouse_uuids` / `product_category_uuids` Orval types).
 */
export type InspectionListFilterParams = {
  inspection_type?: GetInspectionsApiInspectionsGetInspectionType;
  /** Warehouse numeric ids from kpi-parameters `warehouses[].value`. */
  warehouse_ids?: number[] | null;
  /** Plant numeric ids from kpi-parameters `plants[].value` (inbound). */
  plant_ids?: number[] | null;
  /** Category pair keys from kpi-parameters, e.g. `AC|SPLIT`. */
  product_category?: string[] | null;
  /** Inspector user ids from kpi-parameters `users[].value`. */
  user_ids?: number[] | null;
};

export type InspectionsPageParams = InspectionListFilterParams & {
  page?: number;
  per_page?: number;
  search?: string | null;
  sort_by?: string | null;
  sort_dir?: string;
  date_field?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  is_active?: boolean;
};

export type InspectionKpisQueryParams = {
  period?: GetInspectionKpisApiInspectionsKpisGetPeriod;
  date_from?: string | null;
  date_to?: string | null;
  is_active?: boolean;
  warehouse_ids?: number[] | null;
  plant_ids?: number[] | null;
  product_category?: string[] | null;
  user_ids?: number[] | null;
};

/** Parses kpi-parameters numeric `value` strings (warehouse, plant, user ids). */
export function parseNumericIdsFromFilterValues(
  values: string[] | undefined,
): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of values ?? []) {
    const n = Number.parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** @deprecated Use {@link parseNumericIdsFromFilterValues}. */
export const parseWarehouseIdsFromFilterValues = parseNumericIdsFromFilterValues;

export function parseProductCategoryKeysFromFilterValues(
  values: string[] | undefined,
): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function assignArrayParam(
  target: Record<string, unknown>,
  key: string,
  values: unknown[] | null | undefined,
) {
  if (values && values.length > 0) target[key] = values;
}

/** Serializes list query params for FastAPI repeated query keys (`indexes: null`). */
export function serializeInspectionListQueryParams(
  params: InspectionsPageParams,
): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? 100,
    sort_by: params.sort_by ?? "created_at",
    sort_dir: params.sort_dir ?? "desc",
  };

  const search = params.search?.trim();
  if (search) q.search = search;
  if (params.inspection_type) q.inspection_type = params.inspection_type;
  if (params.date_field) q.date_field = params.date_field;
  if (params.date_from) q.date_from = params.date_from;
  if (params.date_to) q.date_to = params.date_to;
  if (params.is_active !== undefined) q.is_active = params.is_active;

  assignArrayParam(q, "warehouse_ids", params.warehouse_ids);
  assignArrayParam(q, "plant_ids", params.plant_ids);
  assignArrayParam(q, "product_category", params.product_category);
  assignArrayParam(q, "user_ids", params.user_ids);

  return q;
}

export function serializeInspectionKpisQueryParams(
  params: InspectionKpisQueryParams,
): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (params.period) q.period = params.period;
  if (params.date_from) q.date_from = params.date_from;
  if (params.date_to) q.date_to = params.date_to;
  if (params.is_active !== undefined) q.is_active = params.is_active;
  assignArrayParam(q, "warehouse_ids", params.warehouse_ids);
  assignArrayParam(q, "plant_ids", params.plant_ids);
  assignArrayParam(q, "product_category", params.product_category);
  assignArrayParam(q, "user_ids", params.user_ids);
  return q;
}
