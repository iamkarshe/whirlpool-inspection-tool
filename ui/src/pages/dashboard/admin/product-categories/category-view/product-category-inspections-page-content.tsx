import type { ProductCategoryViewContext } from "@/pages/dashboard/admin/product-categories/category-view/context";
import ProductCategoryInspectionsDataTable from "@/pages/dashboard/admin/product-categories/category-view/product-category-inspections-data-table";
import type { ProductCategoryInspectionTableMode } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspections-server-table";
import { useProductCategoryInspectionsServerTable } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspections-server-table";
import { useOutletContext } from "react-router-dom";

const downloadFiles: Record<ProductCategoryInspectionTableMode, string> = {
  all: "product-category-inspections.csv",
  inbound: "product-category-inbound-inspections.csv",
  outbound: "product-category-outbound-inspections.csv",
  inboundFailed: "product-category-inbound-failed-inspections.csv",
  outboundFailed: "product-category-outbound-failed-inspections.csv",
};

export default function ProductCategoryInspectionsPageContent({
  mode,
}: {
  mode: ProductCategoryInspectionTableMode;
}) {
  const { categoryUuid, dateRange } = useOutletContext<ProductCategoryViewContext>();
  const { rows, isLoading, serverSide } = useProductCategoryInspectionsServerTable(
    categoryUuid,
    mode,
    dateRange,
  );

  return (
    <ProductCategoryInspectionsDataTable
      rows={rows}
      downloadFileName={downloadFiles[mode]}
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
