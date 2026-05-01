import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import SkeletonTable from "@/components/skeleton7";
import type { ProductCategoryViewContext } from "@/pages/dashboard/admin/product-categories/category-view/context";
import ProductCategoryInspectionsDataTable from "@/pages/dashboard/admin/product-categories/category-view/product-category-inspections-data-table";
import {
  isFailedInspection,
  isInboundInspection,
  isOutboundInspection,
  useProductCategoryInspections,
} from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspections";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

type Mode =
  | "all"
  | "inbound"
  | "outbound"
  | "inboundFailed"
  | "outboundFailed";

function byMode(mode: Mode, row: ProductCategoryInspectionResponse) {
  switch (mode) {
    case "inbound":
      return isInboundInspection(row.inspection_type);
    case "outbound":
      return isOutboundInspection(row.inspection_type);
    case "inboundFailed":
      return (
        isInboundInspection(row.inspection_type) &&
        isFailedInspection(row.inspection_type)
      );
    case "outboundFailed":
      return (
        isOutboundInspection(row.inspection_type) &&
        isFailedInspection(row.inspection_type)
      );
    default:
      return true;
  }
}

const downloadFiles: Record<Mode, string> = {
  all: "product-category-inspections.csv",
  inbound: "product-category-inbound-inspections.csv",
  outbound: "product-category-outbound-inspections.csv",
  inboundFailed: "product-category-inbound-failed-inspections.csv",
  outboundFailed: "product-category-outbound-failed-inspections.csv",
};

export default function ProductCategoryInspectionsPageContent({
  mode,
}: {
  mode: Mode;
}) {
  const { categoryUuid, dateRange } = useOutletContext<ProductCategoryViewContext>();
  const { inspections, loading } = useProductCategoryInspections(
    categoryUuid,
    dateRange,
  );
  const rows = useMemo(
    () => inspections.filter((row) => byMode(mode, row)),
    [inspections, mode],
  );

  if (loading) return <SkeletonTable />;
  return (
    <ProductCategoryInspectionsDataTable
      rows={rows}
      downloadFileName={downloadFiles[mode]}
    />
  );
}
