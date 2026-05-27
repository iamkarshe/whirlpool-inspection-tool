import { useMemo } from "react";
import { Target } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelProps } from "recharts";

import type { DefectsParetoChartItem } from "@/api/generated/model/defectsParetoChartItem";
import { ChartCard } from "@/components/chart-card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExecutiveTooltipContent } from "@/pages/dashboard/reports/executive-analytics/executive-tooltip-content";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const paretoChartConfig = {
  defect_count: {
    label: "Defect count",
    theme: {
      light: "hsl(217 91% 55%)",
      dark: "hsl(213 94% 68%)",
    },
  },
  cumulative_pct: {
    label: "Cumulative %",
    theme: {
      light: "hsl(25 95% 52%)",
      dark: "hsl(32 93% 62%)",
    },
  },
} satisfies ChartConfig;

const PARETO_THRESHOLD_PCT = 80;

/** Swatch colors for tooltip (inline styles). */
const SWATCH_BAR_COLOR = "hsl(217 91% 55%)";
const SWATCH_LINE_COLOR = "hsl(25 95% 52%)";

const SWATCH_BAR_CLASS =
  "bg-[hsl(217_91%_55%)] dark:bg-[hsl(213_94%_68%)]";
const SWATCH_LINE_CLASS =
  "bg-[hsl(25_95%_52%)] dark:bg-[hsl(32_93%_62%)]";

const TABLE_BAR_TEXT =
  "text-[hsl(217_91%_50%)] dark:text-[hsl(213_94%_72%)]";
const TABLE_LINE_TEXT =
  "text-[hsl(25_90%_45%)] dark:text-[hsl(32_93%_65%)]";

const CHART_BAR_FILL = "var(--color-defect_count)";
const CHART_LINE_STROKE = "var(--color-cumulative_pct)";

const AXIS_LINE = {
  stroke: "hsl(var(--border))",
  strokeWidth: 1,
};

const AXIS_TICK_LINE = {
  stroke: "hsl(var(--border))",
};

const FONT_MONO =
  'var(--font-mono, "DM Mono"), ui-monospace, SFMono-Regular, Menlo, monospace';

const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: FONT_MONO,
};

const AXIS_NAME_STYLE = {
  fontSize: 10,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: FONT_MONO,
  letterSpacing: "0.08em",
  fontWeight: 600,
  textAnchor: "middle" as const,
};

const VALUE_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  fontFamily: FONT_MONO,
  fill: "hsl(var(--foreground))",
};

const BAR_VALUE_LABEL_STYLE = {
  fontSize: 15,
  fontWeight: 700,
  fontFamily: FONT_MONO,
  fill: "hsl(var(--foreground))",
};

const PCT_VALUE_LABEL_STYLE = {
  ...VALUE_LABEL_STYLE,
  fill: CHART_LINE_STROKE,
};

/** Bar count label — centered on the column, above the bar top. */
function DefectCountLabel(props: LabelProps) {
  const { x, y, value, width } = props;
  if (x == null || y == null || value == null) return null;
  const barWidth = width != null ? Number(width) : 0;
  const centerX = barWidth > 0 ? Number(x) + barWidth / 2 : Number(x);
  return (
    <text
      x={centerX}
      y={Number(y) - 12}
      textAnchor="middle"
      dominantBaseline="auto"
      style={BAR_VALUE_LABEL_STYLE}
    >
      {Number(value).toLocaleString()}
    </text>
  );
}

/** Cumulative % — offset higher so it does not overlap the bar count label. */
function CumulativePctLabel(props: LabelProps) {
  const { x, y, value, width } = props;
  if (x == null || y == null || value == null) return null;
  const barWidth = width != null ? Number(width) : 0;
  const centerX = barWidth > 0 ? Number(x) + barWidth / 2 : Number(x);
  return (
    <text
      x={centerX}
      y={Number(y) - 30}
      textAnchor="middle"
      style={PCT_VALUE_LABEL_STYLE}
    >
      {`${Number(value).toFixed(1)}%`}
    </text>
  );
}

function ParetoChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: ParetoChartRow }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const title = label ?? row.type;

  return (
    <div className="min-w-[220px] rounded-lg border border-border/80 bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-background/90">
      <Badge
        variant="secondary"
        className="mb-2.5 max-w-[240px] truncate font-semibold"
      >
        {title}
      </Badge>
      <div className="flex flex-col gap-2">
        <ExecutiveTooltipContent
          label="Defect count"
          value={row.defect_count}
          color={SWATCH_BAR_COLOR}
        />
        <ExecutiveTooltipContent
          label="Contribution"
          value={row.pct_contribution.toFixed(1)}
          suffix="%"
          color={SWATCH_BAR_COLOR}
        />
        <ExecutiveTooltipContent
          label="Cumulative"
          value={row.cumulative_pct.toFixed(1)}
          suffix="%"
          color={SWATCH_LINE_COLOR}
        />
      </div>
    </div>
  );
}

type ParetoChartRow = {
  type: string;
  defect_count: number;
  pct_contribution: number;
  cumulative_pct: number;
  within_pareto_80: boolean;
};

function truncateLabel(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildChartRows(items: DefectsParetoChartItem[]): ParetoChartRow[] {
  return items.map((item) => ({
    type: item.section,
    defect_count: item.defect_count,
    pct_contribution: item.pct_contribution,
    cumulative_pct: item.cumulative_pct,
    within_pareto_80: item.within_pareto_80,
  }));
}

function buildKeyInsight(items: DefectsParetoChartItem[]) {
  if (items.length === 0) return null;

  let vital = items.filter((item) => item.within_pareto_80);
  if (vital.length === 0) {
    vital = [];
    for (const item of items) {
      vital.push(item);
      if (item.cumulative_pct >= PARETO_THRESHOLD_PCT) break;
    }
  }

  const names = vital.map((item) => item.section);
  const cumulativePct = vital[vital.length - 1]?.cumulative_pct ?? 0;
  const count = vital.length;

  return { count, names, cumulativePct };
}

function ParetoChartLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-1 text-xs">
      <span className="text-muted-foreground flex items-center gap-2">
        <span
          className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", SWATCH_BAR_CLASS)}
          aria-hidden
        />
        <span>Defect count</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          (left)
        </span>
      </span>
      <span className="text-muted-foreground flex items-center gap-2">
        <span
          className={cn("h-0.5 w-5 shrink-0 rounded-full", SWATCH_LINE_CLASS)}
          aria-hidden
        />
        <span>Cumulative %</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          (right)
        </span>
      </span>
      <span className="text-muted-foreground flex items-center gap-2">
        <span
          className="h-0 w-5 shrink-0 border-t-2 border-dashed border-destructive/80 dark:border-destructive"
          aria-hidden
        />
        <span>80% Pareto target</span>
      </span>
    </div>
  );
}

export function ExecutiveDefectsParetoChart({
  items,
  totalDefects,
  isLoading,
}: {
  items: DefectsParetoChartItem[];
  totalDefects: number;
  isLoading?: boolean;
}) {
  const chartData = useMemo(() => buildChartRows(items), [items]);
  const keyInsight = useMemo(() => buildKeyInsight(items), [items]);
  const categoryCount = chartData.length;

  const countMax = useMemo(
    () => Math.max(...chartData.map((row) => row.defect_count), 0),
    [chartData],
  );
  const countAxisMax = countMax > 0 ? Math.ceil(countMax * 1.12) : 10;

  const barSize = useMemo(() => {
    if (categoryCount <= 1) return 88;
    if (categoryCount <= 3) return 64;
    if (categoryCount <= 6) return 48;
    return 36;
  }, [categoryCount]);

  const xAxisAngle = categoryCount > 5 ? -32 : 0;
  const xAxisHeight = categoryCount > 5 ? 64 : 36;
  const labelMax = categoryCount > 8 ? 10 : categoryCount > 4 ? 14 : 24;

  const chartMargins = useMemo(
    () => ({
      top: 20,
      right: 4,
      left: 4,
      bottom: xAxisHeight - 4,
    }),
    [xAxisHeight],
  );

  return (
    <ChartCard
      title="Defects Pareto Chart"
      description="Focus on the vital few — top causes contributing to 80% of total defects"
      className="lg:col-span-12"
      contentClassName="space-y-5"
    >
      {isLoading ? (
        <Skeleton className="h-[380px] w-full rounded-lg" />
      ) : chartData.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No defect data for the selected filters and period.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border/80 bg-muted/25 p-4 pt-3 shadow-sm dark:bg-card/40 dark:shadow-none dark:ring-1 dark:ring-border/60">
            <ParetoChartLegend />
            <ChartContainer
              config={paretoChartConfig}
              className={cn(
                "aspect-auto h-[min(360px,50vh)] w-full min-h-[280px] pl-8 pr-10",
                "[&_.recharts-cartesian-axis-line]:stroke-border",
                "[&_.recharts-cartesian-axis-tick_line]:stroke-border",
                "[&_.recharts-dot]:hidden",
                "[&_.recharts-line-dots]:hidden",
                "[&_.recharts-active-dot]:hidden",
              )}
            >
              <ComposedChart
                data={chartData}
                margin={chartMargins}
                barCategoryGap={categoryCount <= 2 ? "28%" : "18%"}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.55}
                />
                <XAxis
                  dataKey="type"
                  tickLine={AXIS_TICK_LINE}
                  axisLine={AXIS_LINE}
                  tickMargin={10}
                  interval={0}
                  angle={xAxisAngle}
                  textAnchor={xAxisAngle ? "end" : "middle"}
                  height={xAxisHeight}
                  tick={AXIS_TICK_STYLE}
                  tickFormatter={(value) =>
                    truncateLabel(String(value), labelMax)
                  }
                />
                <YAxis
                  yAxisId="left"
                  tickLine={AXIS_TICK_LINE}
                  axisLine={AXIS_LINE}
                  width={44}
                  domain={[0, countAxisMax]}
                  allowDecimals={false}
                  tick={AXIS_TICK_STYLE}
                  label={{
                    value: "COUNT",
                    angle: -90,
                    position: "left",
                    offset: 0,
                    style: AXIS_NAME_STYLE,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={AXIS_TICK_LINE}
                  axisLine={AXIS_LINE}
                  width={48}
                  domain={[0, 100]}
                  tick={AXIS_TICK_STYLE}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: "CUMULATIVE %",
                    angle: -90,
                    position: "right",
                    offset: 0,
                    style: AXIS_NAME_STYLE,
                  }}
                />
                <ChartTooltip
                  cursor={{
                    fill: "hsl(var(--muted))",
                    opacity: 0.4,
                  }}
                  content={<ParetoChartTooltip />}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={PARETO_THRESHOLD_PCT}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  strokeOpacity={0.9}
                  label={{
                    value: "80%",
                    position: "insideTopRight",
                    fill: "hsl(var(--destructive))",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: FONT_MONO,
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="defect_count"
                  name="defect_count"
                  fill={CHART_BAR_FILL}
                  fillOpacity={0.9}
                  radius={[6, 6, 0, 0]}
                  barSize={barSize}
                  isAnimationActive={categoryCount <= 12}
                >
                  <LabelList dataKey="defect_count" content={DefectCountLabel} />
                </Bar>
                {categoryCount >= 2 ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative_pct"
                    name="cumulative_pct"
                    stroke={CHART_LINE_STROKE}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={categoryCount <= 12}
                  >
                    {categoryCount <= 8 ? (
                      <LabelList
                        dataKey="cumulative_pct"
                        content={CumulativePctLabel}
                      />
                    ) : null}
                  </Line>
                ) : null}
              </ComposedChart>
            </ChartContainer>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_minmax(240px,300px)]">
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Defect type</TableHead>
                    <TableHead className="text-right font-semibold">
                      Defect count
                    </TableHead>
                    <TableHead
                      className={cn("text-right font-semibold", TABLE_BAR_TEXT)}
                    >
                      % Contribution
                    </TableHead>
                    <TableHead
                      className={cn("text-right font-semibold", TABLE_LINE_TEXT)}
                    >
                      Cumulative %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, index) => (
                    <TableRow
                      key={row.section}
                      className={cn(
                        index % 2 === 1 && "bg-muted/15",
                        row.within_pareto_80 && "bg-amber-500/5",
                      )}
                    >
                      <TableCell className="font-medium">{row.section}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.defect_count.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-medium",
                          TABLE_BAR_TEXT,
                        )}
                      >
                        {row.pct_contribution.toFixed(1)}%
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-medium",
                          TABLE_LINE_TEXT,
                        )}
                      >
                        {row.cumulative_pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {keyInsight ? (
              <div className="flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-background">
                <div className="border-b border-primary/15 bg-primary/10 px-4 py-2.5">
                  <p className="text-sm font-semibold text-primary">
                    Key insight
                  </p>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-4 text-sm leading-relaxed">
                  <p className="text-foreground">
                    Top{" "}
                    <span className="font-semibold">{keyInsight.count}</span>{" "}
                    defect {keyInsight.count === 1 ? "type" : "types"}
                    {keyInsight.names.length > 0 ? (
                      <>
                        {" "}
                        (
                        <span className="font-medium">
                          {keyInsight.names.join(", ")}
                        </span>
                        )
                      </>
                    ) : null}{" "}
                    account for{" "}
                    <span className="font-semibold text-primary">
                      {keyInsight.cumulativePct.toFixed(1)}%
                    </span>{" "}
                    of defects
                    {totalDefects > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({totalDefects.toLocaleString()} total)
                      </span>
                    ) : null}
                    .
                  </p>
                  <p className="text-muted-foreground flex items-start gap-2.5 rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
                    <Target
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>
                      Prioritize corrective actions on these vital-few causes
                      first.
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </ChartCard>
  );
}
