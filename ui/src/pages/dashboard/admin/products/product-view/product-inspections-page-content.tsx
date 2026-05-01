import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import SkeletonTable from "@/components/skeleton7";
import type { ProductViewContext } from "@/pages/dashboard/admin/products/product-view/context";
import ProductInspectionsDataTable from "@/pages/dashboard/admin/products/product-view/product-inspections-data-table";
import { useProductInspectionsApi } from "@/pages/dashboard/admin/products/product-view/use-product-inspections-api";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

type Mode = "all" | "inbound" | "outbound" | "inboundFailed" | "outboundFailed";

function normalizeType(t: string) {
  return t.toLowerCase();
}

function byMode(mode: Mode, row: ProductCategoryInspectionResponse) {
  const type = normalizeType(row.inspection_type);
  const inbound = type.includes("inbound");
  const outbound = type.includes("outbound");
  const failed = type.includes("fail") || type.includes("reject");

  switch (mode) {
    case "inbound":
      return inbound;
    case "outbound":
      return outbound;
    case "inboundFailed":
      return inbound && failed;
    case "outboundFailed":
      return outbound && failed;
    default:
      return true;
  }
}

const downloadFiles: Record<Mode, string> = {
  all: "product-inspections.csv",
  inbound: "product-inbound-inspections.csv",
  outbound: "product-outbound-inspections.csv",
  inboundFailed: "product-inbound-failed-inspections.csv",
  outboundFailed: "product-outbound-failed-inspections.csv",
};

export default function ProductInspectionsPageContent({ mode }: { mode: Mode }) {
  const { product, categoryUuid, dateRange } = useOutletContext<ProductViewContext>();
  const { rows, loading } = useProductInspectionsApi(product, categoryUuid, dateRange);
  const data = useMemo(() => rows.filter((r) => byMode(mode, r)), [rows, mode]);

  if (loading) return <SkeletonTable />;
  return <ProductInspectionsDataTable rows={data} downloadFileName={downloadFiles[mode]} />;
}
