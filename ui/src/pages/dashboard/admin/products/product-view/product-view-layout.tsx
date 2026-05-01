import { TabbedContent } from "@/components/tabbed-content";
import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import type { ProductResponse } from "@/api/generated/model/productResponse";
import { PAGES } from "@/endpoints";
import type { ProductViewContext } from "@/pages/dashboard/admin/products/product-view/context";
import { fetchAllProductCategories } from "@/services/product-categories-api";
import { fetchProductDetail } from "@/services/products-api";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Link, Outlet, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function ProductViewLayout() {
  const params = useParams();
  const productUuid = params.id ?? "";

  const [categoryUuidById, setCategoryUuidById] = useState<Map<number, string>>(
    new Map(),
  );
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [detail, categories] = await Promise.all([
          fetchProductDetail(productUuid, { signal: ac.signal }),
          fetchAllProductCategories({ signal: ac.signal }),
        ]);
        if (cancelled) return;
        setProduct(detail);
        setCategoryUuidById(new Map(categories.map((c) => [c.id, c.uuid] as const)));
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Failed to load product.";
        toast.error(message);
        setProduct(null);
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [productUuid]);

  useEffect(() => {
    const title = product?.material_code?.trim();
    document.title = title ? title : "Product";
  }, [product?.material_code]);

  const basePath = useMemo(
    () => PAGES.productViewPath(productUuid),
    [productUuid],
  );
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
              {loading ? "Product" : product?.material_code ?? "-"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `Product [${product?.id ?? "-"}]`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" asChild>
            <Link
              to={`${PAGES.DASHBOARD_INSPECTIONS}?product=${encodeURIComponent(
                product?.material_code ?? "",
              )}`}
            >
              Open in Inspections
            </Link>
          </Button>
        </div>
      </div>

      <TabbedContent tabs={tabs}>
        <Outlet
          context={
            {
              productUuid,
              product,
              categoryUuid:
                product && categoryUuidById.has(product.product_category_id)
                  ? categoryUuidById.get(product.product_category_id) ?? null
                  : null,
              dateRange,
              setDateRange,
            } satisfies ProductViewContext
          }
        />
      </TabbedContent>
    </div>
  );
}

