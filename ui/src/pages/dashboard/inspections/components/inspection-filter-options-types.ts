export type InspectionFilterOption = { id: string; label: string };

/** Options from `GET /api/reports/kpi-parameters` (`value` / `label` pairs). */
export type InspectionFilterOptionsSource = {
  warehouses: InspectionFilterOption[];
  plants: InspectionFilterOption[];
  users: InspectionFilterOption[];
  productCategories: InspectionFilterOption[];
};

export function normalizeInspectionFilterOptionsSource(
  raw: Partial<InspectionFilterOptionsSource> | null | undefined,
): InspectionFilterOptionsSource {
  return {
    warehouses: raw?.warehouses ?? [],
    plants: raw?.plants ?? [],
    users: raw?.users ?? [],
    productCategories: raw?.productCategories ?? [],
  };
}

/** Rejects stale session cache entries from older filter-metadata shapes. */
export function isCompleteInspectionFilterOptionsSource(
  raw: unknown,
): raw is InspectionFilterOptionsSource {
  if (!raw || typeof raw !== "object") return false;
  const source = raw as Partial<InspectionFilterOptionsSource>;
  return (
    Array.isArray(source.warehouses) &&
    Array.isArray(source.plants) &&
    Array.isArray(source.users) &&
    Array.isArray(source.productCategories)
  );
}
