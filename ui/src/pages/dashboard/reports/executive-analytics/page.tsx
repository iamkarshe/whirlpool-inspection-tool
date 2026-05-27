import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { ChartCard } from "@/components/chart-card";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  getDefectRateByType,
  getExecutiveAnalyticsKpis,
  getInspectionVolumeByLocation,
  getInspectionVolumeTrend,
  type DefectRateByType,
  type ExecutiveAnalyticsKpis,
  type VolumeByDimension,
  type VolumeTrendPoint,
} from "@/pages/dashboard/reports/executive-analytics/executive-analytics-service";
import {
  dialogValueToExecutiveFilters,
  executiveFiltersToDialogValue,
  fetchExecutiveKpiParameters,
  mapKpiParametersToFilterSections,
  type ExecutiveAnalyticsFilters,
} from "@/pages/dashboard/reports/executive-analytics/executive-analytics-filters";
import { ExecutiveTooltipContent } from "@/pages/dashboard/reports/executive-analytics/executive-tooltip-content";
import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";
import { AlertTriangle, ClipboardCheck, Clock, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

const volumeChartConfig = {
  volume: {
    label: "Inspections",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const defectChartConfig = {
  rate: {
    label: "Defect %",
    color: "var(--chart-2)",
  },
  critical: { label: "Critical", color: "var(--chart-1)" },
  major: { label: "Major", color: "var(--chart-2)" },
  minor: { label: "Minor", color: "var(--chart-3)" },
} satisfies ChartConfig;

const trendChartConfig = {
  volume: { label: "Volume", color: "var(--chart-1)" },
  defects: { label: "Defects", color: "var(--chart-2)" },
} satisfies ChartConfig;

function buildKpiCards(kpis: ExecutiveAnalyticsKpis): KpiCardProps[] {
  return [
    {
      label: "Inspection volume",
      value: kpis.inspectionVolume.toLocaleString(),
      change: kpis.inspectionVolumeChange,
      changeType: kpis.inspectionVolumeChangeType,
      icon: ClipboardCheck,
    },
    {
      label: "Defect rate",
      value: `${kpis.defectRatePct}%`,
      change: kpis.defectRateChange,
      changeType: kpis.defectRateChangeType,
      icon: AlertTriangle,
    },
    {
      label: "Avg inspection time",
      value: `${kpis.avgInspectionTimeMin} min`,
      change: kpis.avgInspectionTimeChange,
      changeType: kpis.avgInspectionTimeChangeType,
      icon: Clock,
    },
    {
      label: "Pending approvals",
      value: kpis.pendingApprovals.toLocaleString(),
      change: kpis.pendingApprovalsChange,
      changeType: kpis.pendingApprovalsChangeType,
      icon: Inbox,
    },
  ];
}

export default function ExecutiveAnalyticsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<ExecutiveAnalyticsKpis | null>(null);
  const [volumeByLocation, setVolumeByLocation] = useState<VolumeByDimension[]>(
    [],
  );
  const [defectByType, setDefectByType] = useState<DefectRateByType[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [kpiParameters, setKpiParameters] =
    useState<KpiParametersResponse | null>(null);
  const [filters, setFilters] = useState<ExecutiveAnalyticsFilters>({});

  const filterOptionsLoadedRef = useRef(false);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("f");
    if (!token) {
      queueMicrotask(() => setFilters({}));
      return;
    }

    try {
      const raw = localStorage.getItem(`executive-analytics-filters:${token}`);
      if (!raw) {
        queueMicrotask(() => setFilters({}));
        return;
      }
      const parsed = JSON.parse(raw) as ExecutiveAnalyticsFilters;
      queueMicrotask(() =>
        setFilters({
          warehouseIds: parsed.warehouseIds ?? [],
          plantIds: parsed.plantIds ?? [],
          productCategoryKeys: parsed.productCategoryKeys ?? [],
          grading: parsed.grading ?? null,
        }),
      );
    } catch {
      queueMicrotask(() => setFilters({}));
    }
  }, [location.search]);

  const ensureFilterOptionsLoaded = useCallback(async () => {
    if (filterOptionsLoadedRef.current) return;
    setFilterOptionsLoading(true);
    try {
      const params = await fetchExecutiveKpiParameters();
      setKpiParameters(params);
      filterOptionsLoadedRef.current = true;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load filter options.";
      toast.error(message);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, []);

  const handleFilterDialogOpen = useCallback(() => {
    void ensureFilterOptionsLoaded();
  }, [ensureFilterOptionsLoaded]);

  const filterValue = useMemo(
    () => executiveFiltersToDialogValue(filters),
    [filters],
  );

  const filterSections = useMemo(
    () =>
      kpiParameters ? mapKpiParametersToFilterSections(kpiParameters) : [],
    [kpiParameters],
  );

  function applyFilters(next: Record<string, string[]>) {
    const nextFilters = dialogValueToExecutiveFilters(next);

    const isEmpty = Object.keys(nextFilters).length === 0;

    if (isEmpty) {
      setFilters({});
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }

    const token = crypto.randomUUID();
    localStorage.setItem(
      `executive-analytics-filters:${token}`,
      JSON.stringify(nextFilters),
    );
    setFilters(nextFilters);
    const search = new URLSearchParams({ f: token }).toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true },
    );
  }

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    Promise.all([
      getExecutiveAnalyticsKpis(dateRange),
      getInspectionVolumeByLocation(dateRange),
      getDefectRateByType(dateRange),
      getInspectionVolumeTrend(dateRange),
    ])
      .then(([k, loc, def, trend]) => {
        setKpis(k);
        setVolumeByLocation(loc);
        setDefectByType(def);
        setVolumeTrend(trend);
      })
      .finally(() => setLoading(false));
  }, [dateRange, filters]);

  return (
    <div
      data-containerid="dashboard-reports-executive-analytics"
      data-testid="screen-dashboard-reports-executive-analytics"
      className="space-y-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Executive Analytics"
          description="Inspection volume by location, operator, product, avg inspection time, approvals."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <MultiSelectFiltersDialog
            title="Filters"
            description="Warehouse, plant, product category, and damage grading."
            sections={filterSections}
            value={filterValue}
            onApply={applyFilters}
            triggerLabel="Filters"
            onDialogOpen={handleFilterDialogOpen}
            optionsLoading={filterOptionsLoading}
          />
          <Button variant="outline" size="sm">
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {loading ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <KpiCardGrid cards={buildKpiCards(kpis)} />
          ) : null}
        </div>

        <div className="lg:col-span-12 xl:col-span-8">
          <ChartCard
            title="Inspection volume by location"
            description="Last 30 days"
          >
            <ChartContainer
              config={volumeChartConfig}
              className="aspect-auto h-[280px] w-full"
            >
              <BarChart
                data={volumeByLocation}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      className="min-w-[220px] gap-2 border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                      formatter={(v, _name, item, _index, payload) => (
                        <ExecutiveTooltipContent
                          label={String(
                            payload?.payload?.name || "Inspections",
                          )}
                          value={Number(v)}
                          color={item.payload?.fill || item.color}
                        />
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="volume"
                  fill="var(--color-volume)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-12 xl:col-span-4">
          <ChartCard
            title="Defect rate by type (Whirlpool)"
            description="Critical, Major, Minor"
          >
            <ChartContainer
              config={defectChartConfig}
              className="aspect-auto h-[280px] w-full"
            >
              <BarChart
                data={defectByType}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 40, bottom: 8 }}
              >
                <XAxis
                  type="number"
                  unit="%"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      className="min-w-[220px] gap-2 border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                      formatter={(v, _name, item, _index, payload) => (
                        <ExecutiveTooltipContent
                          label={String(payload?.payload?.type || "Rate")}
                          value={Number(v)}
                          suffix="%"
                          color={item.payload?.fill || item.color}
                        />
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="rate"
                  fill="var(--color-rate)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-12">
          <ChartCard
            title="Inspection volume trend"
            description="Weekly volume and defects"
          >
            <ChartContainer
              config={trendChartConfig}
              className="aspect-auto h-[260px] w-full"
            >
              <BarChart
                data={volumeTrend}
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
                      hideLabel
                      className="min-w-[220px] gap-2 border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                      formatter={(v, name, item) => (
                        <ExecutiveTooltipContent
                          label={name === "volume" ? "Volume" : "Defects"}
                          value={Number(v)}
                          color={item.payload?.fill || item.color}
                        />
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="volume"
                  fill="var(--color-volume)"
                  radius={[4, 4, 0, 0]}
                  name="volume"
                />
                <Bar
                  dataKey="defects"
                  fill="var(--color-defects)"
                  radius={[4, 4, 0, 0]}
                  name="defects"
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
