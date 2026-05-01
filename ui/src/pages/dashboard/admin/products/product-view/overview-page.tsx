import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import type { ProductViewContext } from "@/pages/dashboard/admin/products/product-view/context";
import { useOutletContext } from "react-router-dom";
import { useProductInspectionsApi } from "@/pages/dashboard/admin/products/product-view/use-product-inspections-api";
import { PAGES } from "@/endpoints";
import { CheckCircle, ClipboardCheck, Package, XCircle } from "lucide-react";
import { useMemo } from "react";

export default function ProductOverviewPage() {
  const { productUuid, product, categoryUuid, dateRange } =
    useOutletContext<ProductViewContext>();
  const { metrics, loading } = useProductInspectionsApi(
    product,
    categoryUuid,
    dateRange,
  );

  const basePath = useMemo(
    () => PAGES.productViewPath(productUuid),
    [productUuid],
  );

  return (
    <KpiCardGrid
      cards={
        [
          {
            label: "Category",
            value: product?.product_category_name ?? "—",
            icon: Package,
            className: "border-border bg-muted/10 hover:bg-muted/20",
            href: categoryUuid ? PAGES.productCategoryViewPath(categoryUuid) : undefined,
          },
          {
            label: "Total inspections",
            value: loading ? "…" : metrics.total,
            icon: ClipboardCheck,
            className: "border-border bg-muted/10 hover:bg-muted/20",
            href: `${basePath}/inspections`,
          },
          {
            label: "Inbound passed",
            value: loading ? "…" : metrics.inboundPassed,
            icon: CheckCircle,
            className:
              "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
            href: `${basePath}/inspections/inbound`,
          },
          {
            label: "Inbound failed",
            value: loading ? "…" : metrics.inboundFailed,
            icon: XCircle,
            className:
              "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
            href: `${basePath}/inspections/inbound-failed`,
          },
          {
            label: "Outbound passed",
            value: loading ? "…" : metrics.outboundPassed,
            icon: CheckCircle,
            className:
              "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
            href: `${basePath}/inspections/outbound`,
          },
          {
            label: "Outbound failed",
            value: loading ? "…" : metrics.outboundFailed,
            icon: XCircle,
            className:
              "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
            href: `${basePath}/inspections/outbound-failed`,
          },
        ] satisfies KpiCardProps[]
      }
      className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
    />
  );
}

