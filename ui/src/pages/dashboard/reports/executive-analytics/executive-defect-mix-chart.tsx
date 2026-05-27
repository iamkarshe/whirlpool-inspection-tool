import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import type { DefectsMixItem } from "@/api/generated/model/defectsMixItem";
import { ChartCard } from "@/components/chart-card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ExecutiveTooltipContent } from "@/pages/dashboard/reports/executive-analytics/executive-tooltip-content";

const GRADING_FILL: Record<string, string> = {
  DGR: "var(--chart-1)",
  LDGR: "var(--chart-2)",
  SCRAP: "var(--chart-3)",
};

type MixChartRow = DefectsMixItem & {
  fill: string;
};

function buildChartConfig(items: DefectsMixItem[]): ChartConfig {
  const config: ChartConfig = {};
  for (const item of items) {
    const key = item.grading.toLowerCase();
    config[key] = {
      label: item.grading,
      color: GRADING_FILL[item.grading] ?? "var(--chart-4)",
    };
  }
  return config;
}

export function ExecutiveDefectMixChart({
  items,
  totalDefects,
  isLoading,
}: {
  items: DefectsMixItem[];
  totalDefects: number;
  isLoading?: boolean;
}) {
  const chartData = useMemo<MixChartRow[]>(
    () =>
      items.map((item) => ({
        ...item,
        fill: GRADING_FILL[item.grading] ?? "var(--chart-4)",
      })),
    [items],
  );

  const chartConfig = useMemo(() => buildChartConfig(items), [items]);

  return (
    <ChartCard
      title="Defect mix"
      description="Share of graded defects (DGR, LDGR, SCRAP)"
    >
      {isLoading ? (
        <Skeleton className="mx-auto aspect-square max-h-[280px] w-full rounded-md" />
      ) : (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[280px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  className="min-w-[220px] gap-2 border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
                  formatter={(_v, _name, item) => {
                    const row = item.payload as unknown as MixChartRow;
                    return (
                      <div className="flex flex-col gap-2">
                        <ExecutiveTooltipContent
                          label={row.grading}
                          value={row.pct_contribution}
                          suffix="%"
                          color={row.fill}
                        />
                        <ExecutiveTooltipContent
                          label="Defect count"
                          value={row.defect_count}
                          color={row.fill}
                        />
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="defect_count"
              nameKey="grading"
              innerRadius={56}
              outerRadius={88}
              strokeWidth={2}
              paddingAngle={chartData.length > 1 ? 2 : 0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.grading} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                    return null;
                  }
                  const cx = viewBox.cx as number;
                  const cy = viewBox.cy as number;
                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={cx}
                        y={cy - 6}
                        className="fill-foreground text-2xl font-semibold"
                      >
                        {totalDefects.toLocaleString()}
                      </tspan>
                      <tspan
                        x={cx}
                        y={cy + 16}
                        className="fill-muted-foreground text-xs"
                      >
                        Total defects
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      )}
      {!isLoading && chartData.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          {chartData.map((row) => (
            <li
              key={row.grading}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: row.fill }}
                  aria-hidden
                />
                <span className="font-medium">{row.grading}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {row.defect_count.toLocaleString()} (
                {row.pct_contribution.toFixed(1)}%)
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </ChartCard>
  );
}
