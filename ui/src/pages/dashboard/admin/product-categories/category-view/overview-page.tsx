import type { ProductCategory } from "@/pages/dashboard/admin/product-categories/product-category-service";
import { getProducts, type Product } from "@/pages/dashboard/admin/products/product-service";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { PAGES } from "@/endpoints";
import { useInspectionCounts } from "@/components/inspections/inspection-count-badges";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  ClipboardCheck,
  Package,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Ctx = { categoryId: number; category: ProductCategory | null };

export default function ProductCategoryOverviewPage() {
  const { categoryId } = useOutletContext<Ctx>();
  const [products, setProducts] = useState<Product[]>([]);
  const { total, counts, loading: loadingCounts } = useInspectionCounts({
    productCategoryId: categoryId,
  });

  useEffect(() => {
    getProducts().then((list) => {
      setProducts(list.filter((p) => p.product_category_id === categoryId));
    });
  }, [categoryId]);

  const productsCount = useMemo(() => products.length, [products]);
  const basePath = useMemo(() => PAGES.productCategoryViewPath(categoryId), [categoryId]);

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
                value: loadingCounts ? "…" : total,
                icon: ClipboardCheck,
                className: "border-border bg-muted/10 hover:bg-muted/20",
                href: `${basePath}/inspections`,
              },
              {
                label: "Inbound passed",
                value: loadingCounts ? "…" : (counts?.inboundPassed ?? 0),
                icon: CheckCircle,
                className:
                  "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
                href: `${basePath}/inspections/inbound`,
              },
              {
                label: "Inbound failed",
                value: loadingCounts ? "…" : (counts?.inboundFailed ?? 0),
                icon: XCircle,
                className:
                  "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
                href: `${basePath}/inspections/inbound-failed`,
              },
              {
                label: "Outbound passed",
                value: loadingCounts ? "…" : (counts?.outboundPassed ?? 0),
                icon: CheckCircle,
                className:
                  "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
                href: `${basePath}/inspections/outbound`,
              },
              {
                label: "Outbound failed",
                value: loadingCounts ? "…" : (counts?.outboundFailed ?? 0),
                icon: XCircle,
                className:
                  "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
                href: `${basePath}/inspections/outbound-failed`,
              },
          ] satisfies KpiCardProps[]
        }
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
      />
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ArrowDownToLine className="h-3.5 w-3.5" /> Inbound
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowUpFromLine className="h-3.5 w-3.5" /> Outbound
        </span>
      </div>

      <div className="pt-2">
        <Button variant="outline" asChild>
          <Link
            to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?product_category_id=${categoryId}`}
          >
            Open Executive Summary
          </Link>
        </Button>
      </div>
    </div>
  );
}

