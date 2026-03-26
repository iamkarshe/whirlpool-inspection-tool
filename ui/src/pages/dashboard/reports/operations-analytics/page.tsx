import {
  Bug,
  CircleDot,
  CheckCircle,
  ClipboardCheck,
  LayoutGrid,
  LogIn,
  Monitor,
  Percent,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/chart-card";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import KpiLoader from "@/components/kpi-loader";
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
import { PAGES } from "@/endpoints";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import {
  getUsers,
  type User,
} from "@/pages/dashboard/admin/users/user-service";
import {
  getWarehouses,
  type Warehouse,
} from "@/pages/dashboard/admin/warehouses/warehouse-service";
import {
  getOperationsAnalyticsKpis,
  getOperationsSummaryByCategory,
  getOperationsTrendFiltered,
  type OperationsAnalyticsFilters,
  type OperationsAnalyticsKpis,
  type OperationsSummaryByCategory,
  type OperationsTrendPoint,
} from "@/pages/dashboard/reports/operations-analytics/operations-analytics-service";
import { WeeklyTrendDetailsDialog } from "@/pages/dashboard/reports/operations-analytics/weekly-trend-details-dialog";
import { WeeklyTrendTooltipContent } from "@/pages/dashboard/reports/operations-analytics/weekly-trend-tooltip-content";

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

/** Master KPI cards for Operations Analytics. */
function buildSummaryKpiCards(kpis: OperationsAnalyticsKpis): KpiCardProps[] {
  const { inspections } = kpis;
  const passed = inspections.inboundPassed + inspections.outboundPassed;
  const failed = inspections.inboundFailed + inspections.outboundFailed;
  const total = inspections.totalInspections;
  const successRatioPct = total > 0 ? Math.round((passed / total) * 100) : 0;
  return [
    {
      label: "Total inspections",
      value: total,
      icon: ClipboardCheck,
      href: PAGES.DASHBOARD_INSPECTIONS,
    },
    {
      label: "Success ratio",
      value: `${successRatioPct}%`,
      icon: Percent,
      href: PAGES.DASHBOARD_INSPECTIONS,
    },
    {
      label: "Passed inspections",
      value: passed,
      icon: CheckCircle,
      className:
        "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/40 dark:bg-emerald-900/10",
      href: `${PAGES.DASHBOARD_INSPECTIONS}?status=pass`,
    },
    {
      label: "Failed inspections",
      value: failed,
      icon: XCircle,
      className:
        "border-red-200 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/10",
      href: `${PAGES.DASHBOARD_INSPECTIONS}?status=fail`,
    },
    {
      label: "Issues",
      value: failed,
      icon: Bug,
      href: `${PAGES.DASHBOARD_INSPECTIONS}?status=fail`,
    },
  ];
}

/** Detailed section: master KPIs + additional clickable breakdown KPIs. */
function buildAllKpiCards(kpis: OperationsAnalyticsKpis): KpiCardProps[] {
  const { logins, devices } = kpis;
  return [
    ...buildSummaryKpiCards(kpis),
    {
      label: "Successful logins",
      value: logins.successfulLogins,
      change: logins.successChange,
      changeType: logins.successChangeType,
      icon: CheckCircle,
      href: PAGES.DASHBOARD_ADMIN_LOGINS,
    },
    {
      label: "Failed logins",
      value: logins.failedLogins,
      change: logins.failedChange,
      changeType: logins.failedChangeType,
      icon: XCircle,
      href: PAGES.DASHBOARD_ADMIN_LOGINS,
    },
    {
      label: "Unique users (logins)",
      value: logins.uniqueUsers,
      change: logins.usersChange,
      changeType: logins.usersChangeType,
      icon: Users,
      href: PAGES.DASHBOARD_ADMIN_USERS,
    },
    {
      label: "Total devices",
      value: devices.totalDevices,
      change: devices.totalChange,
      changeType: devices.totalChangeType,
      icon: LayoutGrid,
      href: PAGES.DASHBOARD_ADMIN_DEVICES,
    },
    {
      label: "Active devices",
      value: devices.activeDevices,
      change: devices.activeChange,
      changeType: devices.activeChangeType,
      icon: CircleDot,
      href: PAGES.DASHBOARD_ADMIN_DEVICES,
    },
    {
      label: "Mobile devices",
      value: devices.mobileDevices,
      change: devices.mobileChange,
      changeType: devices.mobileChangeType,
      icon: Smartphone,
      href: PAGES.DASHBOARD_ADMIN_DEVICES,
    },
    {
      label: "Desktop devices",
      value: devices.desktopDevices,
      change: devices.desktopChange,
      changeType: devices.desktopChangeType,
      icon: Monitor,
      href: PAGES.DASHBOARD_ADMIN_DEVICES,
    },
    {
      label: "Total logins",
      value: logins.totalLogins,
      change: logins.totalChange,
      changeType: logins.totalChangeType,
      icon: LogIn,
      href: PAGES.DASHBOARD_ADMIN_LOGINS,
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
  const [selectedTrendPoint, setSelectedTrendPoint] =
    useState<OperationsTrendPoint | null>(null);
  const [trendDialogOpen, setTrendDialogOpen] = useState(false);

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
        actionHref: PAGES.DASHBOARD_MASTERS_WAREHOUSES,
        actionLabel: "Open warehouses",
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
      productCategoryIds: (next.productCategoryIds ?? [])
        .map(String)
        .filter(Boolean),
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
    <div
      data-containerid="dashboard-reports-operations-analytics"
      data-testid="screen-dashboard-reports-operations-analytics"
      className="space-y-4"
    >
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
        {/* Top row: master KPIs (single line) */}
        <div className="lg:col-span-12">
          {loading ? (
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <KpiLoader
                count={5}
                className="min-w-[980px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
              />
            </div>
          ) : kpis ? (
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <KpiCardGrid
                cards={buildSummaryKpiCards(kpis)}
                className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 min-w-[980px] gap-3"
              />
            </div>
          ) : null}
        </div>

        {/* Chart row: 8 cols + 4 cols (same layout as Executive) */}
        <div className="lg:col-span-12 xl:col-span-8">
          <ChartCard
            title="Weekly trend"
            description="Inspections, logins, and devices for the selected period"
          >
            <ChartContainer
              config={trendChartConfig}
              className="aspect-auto h-[280px] w-full"
            >
              <BarChart
                data={trend}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                onClick={(state) => {
                  const payload = state?.activePayload?.[0]
                    ?.payload as OperationsTrendPoint | undefined;
                  if (!payload) return;
                  setSelectedTrendPoint(payload);
                  setTrendDialogOpen(true);
                }}
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
                      className="min-w-[220px] gap-2 border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                      hideLabel
                      formatter={(v, name, item) => {
                        return (
                          <WeeklyTrendTooltipContent
                            value={Number(v)}
                            name={name}
                            color={item.payload?.fill || item.color}
                          />
                        );
                      }}
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
          </ChartCard>
        </div>

        <div className="lg:col-span-12 xl:col-span-4">
          <ChartCard
            title="Volume by category"
            description="Current period totals"
          >
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
          </ChartCard>
        </div>

        {/* Full-width: detailed metrics (all 12 KPIs) */}
        <div className="lg:col-span-12">
          {kpis && (
            <Card className="gap-3 py-3">
              <CardHeader className="px-3">
                <CardTitle>Detailed metrics</CardTitle>
                <CardDescription>
                  Inspections, logins, and devices breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3">
                <KpiCardGrid
                  cards={buildAllKpiCards(kpis)}
                  className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WeeklyTrendDetailsDialog
        open={trendDialogOpen}
        onOpenChange={setTrendDialogOpen}
        point={selectedTrendPoint}
      />
    </div>
  );
}
