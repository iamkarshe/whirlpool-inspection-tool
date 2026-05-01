import { TabbedContent } from "@/components/tabbed-content";
import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { PAGES } from "@/endpoints";
import type { ProductCategoryResponse } from "@/api/generated/model/productCategoryResponse";
import type { ProductCategoryViewContext } from "@/pages/dashboard/admin/product-categories/category-view/context";
import { fetchProductCategoryDetail } from "@/services/product-category-view-api";
import { fetchAllProductCategories } from "@/services/product-categories-api";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

export default function ProductCategoryViewLayout() {
  const params = useParams();
  const categoryRef = params.id ?? "";

  const [resolvedCategoryUuid, setResolvedCategoryUuid] = useState(categoryRef);
  const [category, setCategory] = useState<ProductCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        let nextUuid = categoryRef;
        if (/^\d+$/.test(categoryRef)) {
          const categories = await fetchAllProductCategories({ signal: ac.signal });
          const match = categories.find((c) => String(c.id) === categoryRef);
          if (!match) throw new Error("Product category not found.");
          nextUuid = match.uuid;
        }
        const data = await fetchProductCategoryDetail(nextUuid, ac.signal);
        if (cancelled) return;
        setResolvedCategoryUuid(nextUuid);
        setCategory(data);
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Failed to load product category.";
        toast.error(message);
        setCategory(null);
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [categoryRef]);

  useEffect(() => {
    const name = category?.name?.trim();
    document.title = name ? name : "Product Category";
  }, [category?.name]);

  const basePath = useMemo(
    () => PAGES.productCategoryViewPath(resolvedCategoryUuid),
    [resolvedCategoryUuid],
  );
  const tabs = useMemo(
    () => [
      { label: "Overview", to: basePath, end: true },
      { label: "Products", to: `${basePath}/products`, end: true },
      { label: "Inspections", to: `${basePath}/inspections`, end: true },
      { label: "Inbound Inspections", to: `${basePath}/inspections/inbound` },
      { label: "Outbound Inspections", to: `${basePath}/inspections/outbound` },
      {
        label: "Failed Inbound Inspections",
        to: `${basePath}/inspections/inbound-failed`,
      },
      {
        label: "Failed Outbound Inspections",
        to: `${basePath}/inspections/outbound-failed`,
      },
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
            <Link to={PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to product categories</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {loading ? "Product Category" : (category?.name ?? "-")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `Product Category [${category?.id ?? "-"}]`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" asChild>
            <Link
              to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?product_category_id=${category?.uuid ?? resolvedCategoryUuid}`}
            >
              Open Executive Analytics
            </Link>
          </Button>
        </div>
      </div>

      <TabbedContent tabs={tabs}>
        <Outlet
          context={
            {
              categoryUuid: resolvedCategoryUuid,
              category,
              dateRange,
              setDateRange,
            } satisfies ProductCategoryViewContext
          }
        />
      </TabbedContent>
    </div>
  );
}
