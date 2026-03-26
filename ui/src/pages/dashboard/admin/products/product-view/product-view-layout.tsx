import { TabbedContent } from "@/components/tabbed-content";
import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { PAGES } from "@/endpoints";
import { getProductById, type Product } from "@/pages/dashboard/admin/products/product-service";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Link, Outlet, useParams } from "react-router-dom";

export default function ProductViewLayout() {
  const params = useParams();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getProductById(productId)
      .then((p) => setProduct(p))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    const title = product?.serial_number?.trim();
    document.title = title ? title : "Product";
  }, [product?.serial_number]);

  const basePath = useMemo(() => PAGES.productViewPath(productId), [productId]);
  const tabs = useMemo(
    () => [
      { label: "Overview", to: basePath, end: true },
      { label: "Inspections", to: `${basePath}/inspections`, end: true },
      { label: "Inbound Inspections", to: `${basePath}/inspections/inbound` },
      { label: "Outbound Inspections", to: `${basePath}/inspections/outbound` },
      { label: "Failed Inbound Inspections", to: `${basePath}/inspections/inbound-failed` },
      { label: "Failed Outbound Inspections", to: `${basePath}/inspections/outbound-failed` },
    ],
    [basePath],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationFillMode: "backwards" }}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link to={PAGES.DASHBOARD_MASTERS_PRODUCTS}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to products</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {loading ? "Product" : product?.serial_number ?? "-"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `Product [${productId}]`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" asChild>
            <Link
              to={`${PAGES.DASHBOARD_INSPECTIONS}?product=${encodeURIComponent(
                product?.serial_number ?? "",
              )}`}
            >
              Open in Inspections
            </Link>
          </Button>
        </div>
      </div>

      <TabbedContent tabs={tabs}>
        <Outlet context={{ productId, product, dateRange, setDateRange }} />
      </TabbedContent>
    </div>
  );
}

