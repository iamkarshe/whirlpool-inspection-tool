import { TabbedContent } from "@/components/tabbed-content";
import { Button } from "@/components/ui/button";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { PAGES } from "@/endpoints";
import {
  getProductCategoryById,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import type { DateRange } from "react-day-picker";

export default function ProductCategoryViewLayout() {
  const params = useParams();
  const categoryId = Number(params.id);

  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    getProductCategoryById(categoryId)
      .then((c) => setCategory(c))
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => {
    const name = category?.name?.trim();
    document.title = name ? name : "Product Category";
  }, [category?.name]);

  const basePath = useMemo(() => PAGES.productCategoryViewPath(categoryId), [categoryId]);
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
              {loading ? "Product Category" : category?.name ?? "-"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `Product Category [${categoryId}]`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" asChild>
            <Link
              to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?product_category_id=${categoryId}`}
            >
              Open Executive Summary
            </Link>
          </Button>
        </div>
      </div>

      <TabbedContent tabs={tabs}>
        <Outlet context={{ categoryId, category, dateRange, setDateRange }} />
      </TabbedContent>
    </div>
  );
}

