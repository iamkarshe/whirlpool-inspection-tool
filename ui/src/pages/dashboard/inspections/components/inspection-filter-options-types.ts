export type InspectionFilterOption = { id: string; label: string };

/** Options from `GET /api/reports/kpi-parameters` (`value` / `label` pairs). */
export type InspectionFilterOptionsSource = {
  warehouses: InspectionFilterOption[];
  productCategories: InspectionFilterOption[];
};
