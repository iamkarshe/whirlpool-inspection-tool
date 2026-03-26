import type {
  Inspection,
  InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";
import { getInspectionQuestionResults } from "@/pages/dashboard/inspections/inspection-service";
import type {
  MultiSelectFilterSection,
  MultiSelectFiltersValue,
} from "@/components/filters/multi-select-filters-dialog";

export type InspectionStatusFilter = "pass" | "fail";

export type InspectionStatusMap = Record<string, InspectionStatusFilter>;

function hasAnyFailed(rows: InspectionQuestionResult[]) {
  return rows.some((r) => r.status === "fail");
}

export async function computeInspectionStatusMap(
  inspections: Inspection[],
): Promise<InspectionStatusMap> {
  const entries = await Promise.all(
    inspections.map(async (i) => {
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

export function buildInspectionFilterSections(
  inspections: Inspection[],
): MultiSelectFilterSection[] {
  const inspectors = Array.from(
    new Set(inspections.map((i) => i.inspector_name).filter(Boolean)),
  )
    .sort()
    .map((name) => ({ id: name, label: name }));

  const products = Array.from(
    new Set(inspections.map((i) => i.product_serial).filter(Boolean)),
  )
    .sort()
    .map((serial) => ({ id: serial, label: serial }));

  // Warehouse is not currently present in Inspection rows in this UI mock.
  // Keep the section to match UX; options will be empty until data is wired.
  const warehouses: Array<{ id: string; label: string }> = [];

  return [
    {
      key: "type",
      label: "Type",
      options: [
        { id: "inbound", label: "Inbound" },
        { id: "outbound", label: "Outbound" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { id: "pass", label: "Pass" },
        { id: "fail", label: "Fail" },
      ],
    },
    { key: "warehouse", label: "Warehouse", options: warehouses },
    { key: "product", label: "Product", options: products },
    { key: "inspector", label: "Inspector", options: inspectors },
  ];
}

export function applyInspectionFilters(
  inspections: Inspection[],
  value: MultiSelectFiltersValue,
  statusMap: InspectionStatusMap | null,
): Inspection[] {
  const types = new Set(value.type ?? []);
  const statuses = new Set(value.status ?? []);
  const warehouses = new Set(value.warehouse ?? []);
  const products = new Set(value.product ?? []);
  const inspectors = new Set(value.inspector ?? []);

  return inspections.filter((i) => {
    if (types.size > 0 && !types.has(i.inspection_type)) return false;

    if (products.size > 0 && !products.has(i.product_serial)) return false;
    if (inspectors.size > 0 && !inspectors.has(i.inspector_name)) return false;

    // Warehouse currently unavailable in Inspection rows; when selected, nothing matches.
    if (warehouses.size > 0) return false;

    if (statuses.size > 0) {
      const s = statusMap?.[i.id];
      if (!s) return false;
      if (!statuses.has(s)) return false;
    }

    return true;
  });
}

