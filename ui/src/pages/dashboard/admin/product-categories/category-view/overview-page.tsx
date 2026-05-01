import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { PAGES } from "@/endpoints";
import type { ProductCategoryViewContext } from "@/pages/dashboard/admin/product-categories/category-view/context";
import { useProductCategoryInspections } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-inspections";
import { useProductCategoryProducts } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-products";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle, ClipboardCheck, Package, XCircle } from "lucide-react";

export default function ProductCategoryOverviewPage() {
  const { categoryUuid, dateRange } = useOutletContext<ProductCategoryViewContext>();
  const { products } = useProductCategoryProducts(categoryUuid);
  const { metrics, loading } = useProductCategoryInspections(categoryUuid, dateRange);
  const productsCount = useMemo(() => products.length, [products]);
  const basePath = useMemo(
    () => PAGES.productCategoryViewPath(categoryUuid),
    [categoryUuid],
  );

  return (
    <div className="space-y-4">
      <KpiCardGrid
        cards={
          [
            {
              label: "Products",
              value: productsCount,
              icon: Package,
              className: "border-border bg-muted/10 hover:bg-muted/20",
              href: `${basePath}/products`,
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
    </div>
  );
}
