import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";

export type InspectionFilterOption = { id: string; label: string };

export type InspectionFilterContext = {
  warehouseCodeById: Record<string, string>;
  productCategoryLabelByPairKey: Record<string, string>;
};

export type InspectionFilterOptionsSource = {
  kpiParameters: KpiParametersResponse;
  warehouseCodeById: Record<string, string>;
  productCategoryLabelByPairKey: Record<string, string>;
  users: InspectionFilterOption[];
};
