/**
 * Executive Analytics: KPIs from API; charts still mock until wired.
 */

import { getReports } from "@/api/generated/reports/reports";
import type { DefectsWarehouseItem } from "@/api/generated/model/defectsWarehouseItem";
import type { InspectionType } from "@/api/generated/model/inspectionType";
import {
  buildExecutiveAnalyticsRequest,
  type ExecutiveAnalyticsFilters,
} from "@/pages/dashboard/reports/executive-analytics/executive-analytics-filters";
import type { DateRange } from "react-day-picker";

/** Whirlpool defect classification (3 types). */
export type DefectType = "critical" | "major" | "minor";

export interface ExecutiveAnalyticsKpis {
  inspectionVolume: number;
  damagedInspections: number;
  defectRatePct: number;
  avgInspectionTimeMin: number;
  pendingApprovals: number;
}

/** For bar/line charts: inspection volume by dimension. */
export interface VolumeByDimension {
  name: string;
  volume: number;
  fill?: string;
}

/** Defect rate % by Whirlpool type. */
export interface DefectRateByType {
  type: string;
  rate: number;
  count: number;
  fill?: string;
}

const inspectionVolumeByLocation: VolumeByDimension[] = [
  { name: "Warehouse A", volume: 1240, fill: "var(--chart-1)" },
  { name: "Warehouse B", volume: 980, fill: "var(--chart-2)" },
  { name: "Warehouse C", volume: 756, fill: "var(--chart-3)" },
  { name: "Plant North", volume: 612, fill: "var(--chart-4)" },
  { name: "Plant South", volume: 488, fill: "var(--chart-5)" },
];

const inspectionVolumeByOperator: VolumeByDimension[] = [
  { name: "Amit S.", volume: 892 },
  { name: "Priya V.", volume: 756 },
  { name: "Rahul G.", volume: 634 },
  { name: "Sneha K.", volume: 521 },
  { name: "Vikram R.", volume: 403 },
];

const inspectionVolumeByProductCategory: VolumeByDimension[] = [
  { name: "Refrigerators", volume: 1450 },
  { name: "Washers", volume: 1120 },
  { name: "Dryers", volume: 890 },
  { name: "Dishwashers", volume: 456 },
  { name: "Microwaves", volume: 320 },
];

const defectRateByWhirlpoolType: DefectRateByType[] = [
  { type: "Critical", rate: 0.8, count: 24, fill: "var(--chart-1)" },
  { type: "Major", rate: 2.4, count: 72, fill: "var(--chart-2)" },
  { type: "Minor", rate: 4.2, count: 126, fill: "var(--chart-3)" },
];

/** Weekly trend for inspection volume (for line/area chart). */
export interface VolumeTrendPoint {
  week: string;
  volume: number;
  defects: number;
}

const inspectionVolumeTrend: VolumeTrendPoint[] = [
  { week: "W1", volume: 820, defects: 28 },
  { week: "W2", volume: 910, defects: 31 },
  { week: "W3", volume: 880, defects: 26 },
  { week: "W4", volume: 950, defects: 32 },
  { week: "W5", volume: 1020, defects: 29 },
  { week: "W6", volume: 980, defects: 27 },
];

function executiveAnalyticsRequestBody(
  filters: ExecutiveAnalyticsFilters,
  dateRange: DateRange | undefined,
  inspectionType: InspectionType,
) {
  return buildExecutiveAnalyticsRequest(filters, {
    dateRange,
    inspectionType,
  });
}

export async function fetchExecutiveAnalyticsKpis(
  filters: ExecutiveAnalyticsFilters,
  dateRange: DateRange | undefined,
  inspectionType: InspectionType,
): Promise<ExecutiveAnalyticsKpis> {
  const body = executiveAnalyticsRequestBody(
    filters,
    dateRange,
    inspectionType,
  );
  const reports = getReports();
  const res =
    await reports.postExecutiveAnalyticsApiReportsExecutiveAnalyticsPost(body);

  return {
    inspectionVolume: res.inspection_volume,
    damagedInspections: res.damaged_inspections,
    defectRatePct: res.defect_rate_pct,
    avgInspectionTimeMin: res.avg_inspection_time_min,
    pendingApprovals: res.pending_approvals,
  };
}

export async function fetchExecutiveDefectsWarehouse(
  filters: ExecutiveAnalyticsFilters,
  dateRange: DateRange | undefined,
  inspectionType: InspectionType,
): Promise<DefectsWarehouseItem[]> {
  const body = executiveAnalyticsRequestBody(
    filters,
    dateRange,
    inspectionType,
  );
  const reports = getReports();
  const res =
    await reports.postExecutiveAnalyticsDefectsWarehouseApiReportsExecutiveAnalyticsDefectsWarehousePost(
      body,
    );
  return res.items;
}

export async function getInspectionVolumeByLocation(
  _range?: DateRange,
): Promise<VolumeByDimension[]> {
  return new Promise((r) => setTimeout(() => r([...inspectionVolumeByLocation]), 200));
}

export async function getInspectionVolumeByOperator(
  _range?: DateRange,
): Promise<VolumeByDimension[]> {
  return new Promise((r) => setTimeout(() => r([...inspectionVolumeByOperator]), 200));
}

export async function getInspectionVolumeByProductCategory(
  _range?: DateRange,
): Promise<VolumeByDimension[]> {
  return new Promise((r) =>
    setTimeout(() => r([...inspectionVolumeByProductCategory]), 200),
  );
}

export async function getDefectRateByType(
  _range?: DateRange,
): Promise<DefectRateByType[]> {
  return new Promise((r) => setTimeout(() => r([...defectRateByWhirlpoolType]), 200));
}

export async function getInspectionVolumeTrend(
  _range?: DateRange,
): Promise<VolumeTrendPoint[]> {
  return new Promise((r) => setTimeout(() => r([...inspectionVolumeTrend]), 200));
}
