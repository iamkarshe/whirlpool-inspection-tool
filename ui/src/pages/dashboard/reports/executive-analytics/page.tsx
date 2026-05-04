import { DashboardModuleWipDialog } from "@/components/dashboard/dashboard-module-wip-dialog";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { ChartCard } from "@/components/chart-card";
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
import { ExecutiveTooltipContent } from "@/pages/dashboard/reports/executive-analytics/executive-tooltip-content";
import { AlertTriangle, ClipboardCheck, Clock, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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
  const [kpis, setKpis] = useState<ExecutiveAnalyticsKpis | null>(null);
  const [volumeByLocation, setVolumeByLocation] = useState<VolumeByDimension[]>(
    [],
  );
  const [defectByType, setDefectByType] = useState<DefectRateByType[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setLoading(true));
    Promise.all([
      getExecutiveAnalyticsKpis(),
      getInspectionVolumeByLocation(),
      getDefectRateByType(),
      getInspectionVolumeTrend(),
    ])
      .then(([k, loc, def, trend]) => {
        setKpis(k);
        setVolumeByLocation(loc);
        setDefectByType(def);
        setVolumeTrend(trend);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      data-containerid="dashboard-reports-executive-analytics"
      data-testid="screen-dashboard-reports-executive-analytics"
      className="space-y-4"
    >
      <DashboardModuleWipDialog moduleName="Executive Analytics" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Executive Analytics"
          description="Inspection volume by location, operator, product, avg inspection time, approvals."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker />
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
          <ChartCard title="Inspection volume by location" description="Last 30 days">
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
                          label={String(payload?.payload?.name || "Inspections")}
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
          <ChartCard title="Inspection volume trend" description="Weekly volume and defects">
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
