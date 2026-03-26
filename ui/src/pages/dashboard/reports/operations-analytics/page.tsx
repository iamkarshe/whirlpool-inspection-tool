import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ClipboardCheck,
  LogIn,
  LayoutGrid,
  Smartphone,
  Users,
  CheckCircle,
  XCircle,
  CircleDot,
  Monitor,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  getOperationsAnalyticsKpis,
  getOperationsSummaryByCategory,
  getOperationsTrendFiltered,
  type OperationsAnalyticsFilters,
  type OperationsAnalyticsKpis,
  type OperationsTrendPoint,
  type OperationsSummaryByCategory,
} from "@/pages/dashboard/reports/operations-analytics/operations-analytics-service";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getWarehouses,
  type Warehouse,
} from "@/pages/dashboard/admin/warehouses/warehouse-service";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import {
  getUsers,
  type User,
} from "@/pages/dashboard/admin/users/user-service";

const trendChartConfig = {
  inspections: { label: "Inspections", color: "var(--chart-1)" },
  logins: { label: "Logins", color: "var(--chart-2)" },
  devices: { label: "Devices", color: "var(--chart-3)" },
} satisfies ChartConfig;

const summaryChartConfig = {
  value: { label: "Count", color: "var(--chart-1)" },
  inspections: { label: "Inspections", color: "var(--chart-1)" },
  logins: { label: "Logins", color: "var(--chart-2)" },
  devices: { label: "Devices", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Top 4 summary KPI cards (same layout as Executive). */
function buildSummaryKpiCards(kpis: OperationsAnalyticsKpis): KpiCardProps[] {
  const { inspections, logins, devices } = kpis;
  return [
    {
      label: "Total inspections",
      value: inspections.total.toLocaleString(),
      change: inspections.totalChange,
      changeType: inspections.totalChangeType,
      icon: ClipboardCheck,
    },
    {
      label: "Total logins",
      value: logins.totalLogins.toLocaleString(),
      change: logins.totalChange,
      changeType: logins.totalChangeType,
      icon: LogIn,
    },
    {
      label: "Total devices",
      value: devices.totalDevices.toLocaleString(),
      change: devices.totalChange,
      changeType: devices.totalChangeType,
      icon: LayoutGrid,
    },
    {
      label: "Active inspectors",
      value: inspections.uniqueInspectors.toLocaleString(),
      change: inspections.inspectorsChange,
      changeType: inspections.inspectorsChangeType,
      icon: Users,
    },
  ];
}

/** All 12 KPIs for the detailed section. */
function buildAllKpiCards(kpis: OperationsAnalyticsKpis): KpiCardProps[] {
  const { inspections, logins, devices } = kpis;
  return [
    {
      label: "Total inspections",
      value: inspections.total.toLocaleString(),
      change: inspections.totalChange,
      changeType: inspections.totalChangeType,
      icon: ClipboardCheck,
    },
    {
      label: "Inbound",
      value: inspections.inbound.toLocaleString(),
      change: inspections.inboundChange,
      changeType: inspections.inboundChangeType,
      icon: ArrowDownToLine,
    },
    {
      label: "Outbound",
      value: inspections.outbound.toLocaleString(),
      change: inspections.outboundChange,
      changeType: inspections.outboundChangeType,
      icon: ArrowUpFromLine,
    },
    {
      label: "Active inspectors",
      value: inspections.uniqueInspectors.toLocaleString(),
      change: inspections.inspectorsChange,
      changeType: inspections.inspectorsChangeType,
      icon: Users,
    },
    {
      label: "Total logins",
      value: logins.totalLogins.toLocaleString(),
      change: logins.totalChange,
      changeType: logins.totalChangeType,
      icon: LogIn,
    },
    {
      label: "Successful logins",
      value: logins.successfulLogins.toLocaleString(),
      change: logins.successChange,
      changeType: logins.successChangeType,
      icon: CheckCircle,
    },
    {
      label: "Failed logins",
      value: logins.failedLogins.toLocaleString(),
      change: logins.failedChange,
      changeType: logins.failedChangeType,
      icon: XCircle,
    },
    {
      label: "Unique users (logins)",
      value: logins.uniqueUsers.toLocaleString(),
      change: logins.usersChange,
      changeType: logins.usersChangeType,
      icon: Users,
    },
    {
      label: "Total devices",
      value: devices.totalDevices.toLocaleString(),
      change: devices.totalChange,
      changeType: devices.totalChangeType,
      icon: LayoutGrid,
    },
    {
      label: "Active devices",
      value: devices.activeDevices.toLocaleString(),
      change: devices.activeChange,
      changeType: devices.activeChangeType,
      icon: CircleDot,
    },
    {
      label: "Mobile devices",
      value: devices.mobileDevices.toLocaleString(),
      change: devices.mobileChange,
      changeType: devices.mobileChangeType,
      icon: Smartphone,
    },
    {
      label: "Desktop devices",
      value: devices.desktopDevices.toLocaleString(),
      change: devices.desktopChange,
      changeType: devices.desktopChangeType,
      icon: Monitor,
    },
  ];
}

export default function OperationsAnalyticsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<OperationsAnalyticsKpis | null>(null);
  const [trend, setTrend] = useState<OperationsTrendPoint[]>([]);
  const [summaryByCategory, setSummaryByCategory] = useState<
    OperationsSummaryByCategory[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(
    [],
  );
  const [operators, setOperators] = useState<User[]>([]);

  const [filters, setFilters] = useState<OperationsAnalyticsFilters>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("f");
    if (!token) {
      queueMicrotask(() => setFilters({}));
      return;
    }

    try {
      const raw = localStorage.getItem(`ops-analytics-filters:${token}`);
      if (!raw) {
        queueMicrotask(() => setFilters({}));
        return;
      }
      const parsed = JSON.parse(raw) as OperationsAnalyticsFilters;
      queueMicrotask(() =>
        setFilters({
          warehouseIds: parsed.warehouseIds ?? [],
          productCategoryIds: parsed.productCategoryIds ?? [],
          operatorIds: parsed.operatorIds ?? [],
        }),
      );
    } catch {
      queueMicrotask(() => setFilters({}));
    }
  }, [location.search]);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    Promise.all([
      getOperationsAnalyticsKpis(filters),
      getOperationsTrendFiltered(filters),
      getOperationsSummaryByCategory(filters),
    ])
      .then(([k, t, s]) => {
        setKpis(k);
        setTrend(t);
        setSummaryByCategory(s);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    Promise.all([getWarehouses(), getProductCategories(), getUsers()]).then(
      ([w, c, u]) => {
        setWarehouses(w);
        setProductCategories(c);
        setOperators(u.filter((x) => x.role.toLowerCase() === "operator"));
      },
    );
  }, []);

  const filterValue = useMemo(
    () => ({
      warehouseIds: filters.warehouseIds ?? [],
      productCategoryIds: filters.productCategoryIds ?? [],
      operatorIds: filters.operatorIds ?? [],
    }),
    [filters],
  );

  const filterSections = useMemo(
    () => [
      {
        key: "warehouseIds",
        label: "Warehouse",
        options: warehouses.map((w) => ({
          id: w.id,
          label: `${w.warehouse_code} — ${w.name}`,
        })),
      },
      {
        key: "productCategoryIds",
        label: "Product category",
        options: productCategories.map((c) => ({
          id: String(c.id),
          label: c.name,
        })),
      },
      {
        key: "operatorIds",
        label: "Operator",
        options: operators.map((u) => ({
          id: String(u.id),
          label: u.name,
        })),
      },
    ],
    [warehouses, productCategories, operators],
  );

  function applyFilters(next: Record<string, string[]>) {
    const nextFilters: OperationsAnalyticsFilters = {
      warehouseIds: (next.warehouseIds ?? []).map(String).filter(Boolean),
      productCategoryIds: (next.productCategoryIds ?? []).map(String).filter(Boolean),
      operatorIds: (next.operatorIds ?? []).map(String).filter(Boolean),
    };

    const isEmpty =
      (nextFilters.warehouseIds?.length ?? 0) === 0 &&
      (nextFilters.productCategoryIds?.length ?? 0) === 0 &&
      (nextFilters.operatorIds?.length ?? 0) === 0;

    if (isEmpty) {
      setFilters({});
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }

    const token = crypto.randomUUID();
    localStorage.setItem(
      `ops-analytics-filters:${token}`,
      JSON.stringify(nextFilters),
    );
    setFilters(nextFilters);
    const search = new URLSearchParams({ f: token }).toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Operations Analytics"
          description="Inspection, login, and device metrics for the selected period."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker />
          <MultiSelectFiltersDialog
            title="Filters"
            description="Multi-select filters. Applying updates the URL for sharing."
            sections={filterSections}
            value={filterValue}
            onApply={applyFilters}
            triggerLabel="Filters"
          />
          <Button variant="outline" size="sm">
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Top row: 4 KPI cards (same as Executive) */}
        <div className="lg:col-span-12">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-lg border bg-muted/50"
                />
              ))}
            </div>
          ) : kpis ? (
            <KpiCardGrid cards={buildSummaryKpiCards(kpis)} />
          ) : null}
        </div>

        {/* Chart row: 8 cols + 4 cols (same layout as Executive) */}
        <div className="lg:col-span-12 xl:col-span-8">
          <Card className="gap-3 py-3">
            <CardHeader className="px-3">
              <CardTitle>Weekly trend</CardTitle>
              <CardDescription>
                Inspections, logins, and devices over the last 6 weeks
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              <ChartContainer
                config={trendChartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={trend}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(v, name) => [
                          v,
                          name === "inspections"
                            ? "Inspections"
                            : name === "logins"
                              ? "Logins"
                              : "Devices",
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="inspections"
                    fill="var(--color-inspections)"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="logins"
                    fill="var(--color-logins)"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="devices"
                    fill="var(--color-devices)"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-12 xl:col-span-4">
          <Card className="gap-3 py-3">
            <CardHeader className="px-3">
              <CardTitle>Volume by category</CardTitle>
              <CardDescription>Current period totals</CardDescription>
            </CardHeader>
            <CardContent className="px-3">
              <ChartContainer
                config={summaryChartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={summaryByCategory}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Full-width: detailed metrics (all 12 KPIs) */}
        <div className="lg:col-span-12">
          {kpis && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed metrics</CardTitle>
                <CardDescription>
                  Inspections, logins, and devices breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KpiCardGrid
                  cards={buildAllKpiCards(kpis)}
                  className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
