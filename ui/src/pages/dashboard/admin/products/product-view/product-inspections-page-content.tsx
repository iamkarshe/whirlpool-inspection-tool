import type { ProductViewContext } from "@/pages/dashboard/admin/products/product-view/context";
import type { ProductInspectionTableMode } from "@/pages/dashboard/admin/products/product-view/use-product-inspections-server-table";
import { useProductInspectionsServerTable } from "@/pages/dashboard/admin/products/product-view/use-product-inspections-server-table";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import { useOutletContext } from "react-router-dom";

export default function ProductInspectionsPageContent({
  mode,
}: {
  mode: ProductInspectionTableMode;
}) {
  const { product, dateRange } = useOutletContext<ProductViewContext>();
  const { rows, isLoading, serverSide } = useProductInspectionsServerTable(
    product,
    mode,
    dateRange,
  );

  return (
    <InspectionsDataTable
      data={rows}
      serverSide={serverSide}
      isLoading={isLoading}
      hideDeviceColumn={false}
    />
  );
}
