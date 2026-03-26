import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import type { Product } from "@/pages/dashboard/admin/products/product-service";
import { useOutletContext } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { useInspectionCounts } from "@/components/inspections/inspection-count-badges";
import { PAGES } from "@/endpoints";
import { CheckCircle, ClipboardCheck, Package, XCircle } from "lucide-react";
import { useMemo } from "react";

type Ctx = {
  productId: number;
  product: Product | null;
  dateRange?: DateRange | undefined;
};

export default function ProductOverviewPage() {
  const { productId, product, dateRange } = useOutletContext<Ctx>();
  const serial = product?.serial_number ?? "";
  const { total, counts, loading } = useInspectionCounts(
    { productSerial: serial },
    { dateRange },
  );

  const basePath = useMemo(() => PAGES.productViewPath(productId), [productId]);

  return (
    <KpiCardGrid
      cards={
        [
          {
            label: "Category",
            value: product?.category_name ?? "—",
            icon: Package,
            className: "border-border bg-muted/10 hover:bg-muted/20",
            href: product ? PAGES.productCategoryViewPath(product.product_category_id) : undefined,
          },
          {
            label: "Total inspections",
            value: loading ? "…" : total,
            icon: ClipboardCheck,
            className: "border-border bg-muted/10 hover:bg-muted/20",
            href: `${basePath}/inspections`,
          },
          {
            label: "Inbound passed",
            value: loading ? "…" : (counts?.inboundPassed ?? 0),
            icon: CheckCircle,
            className:
              "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
            href: `${basePath}/inspections/inbound`,
          },
          {
            label: "Inbound failed",
            value: loading ? "…" : (counts?.inboundFailed ?? 0),
            icon: XCircle,
            className:
              "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
            href: `${basePath}/inspections/inbound-failed`,
          },
          {
            label: "Outbound passed",
            value: loading ? "…" : (counts?.outboundPassed ?? 0),
            icon: CheckCircle,
            className:
              "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
            href: `${basePath}/inspections/outbound`,
          },
          {
            label: "Outbound failed",
            value: loading ? "…" : (counts?.outboundFailed ?? 0),
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

