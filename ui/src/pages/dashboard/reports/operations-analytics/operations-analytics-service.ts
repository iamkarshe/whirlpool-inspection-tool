/**
 * Aggregates KPIs from inspections, logins, and devices for Operations Analytics.
 * Uses existing module services.
 */
import { getDeviceKpis } from "@/pages/dashboard/admin/devices/device-service";
import { getLoginKpis } from "@/pages/dashboard/admin/logins/login-service";
import { getInspectionKpis } from "@/pages/dashboard/inspections/inspection-service";

export interface OperationsAnalyticsKpis {
  inspections: Awaited<ReturnType<typeof getInspectionKpis>>;
  logins: Awaited<ReturnType<typeof getLoginKpis>>;
  devices: Awaited<ReturnType<typeof getDeviceKpis>>;
}

export type OperationsAnalyticsFilters = {
  warehouseIds?: string[];
  productCategoryIds?: string[];
  operatorIds?: string[];
};

function getFilterScale(filters?: OperationsAnalyticsFilters) {
  const w = filters?.warehouseIds?.length ?? 0;
  const c = filters?.productCategoryIds?.length ?? 0;
  const o = filters?.operatorIds?.length ?? 0;
  const activeTypes = (w > 0 ? 1 : 0) + (c > 0 ? 1 : 0) + (o > 0 ? 1 : 0);
  const total = w + c + o;
  if (activeTypes === 0) return 1;
  const scale = 1 - 0.12 * activeTypes - 0.03 * total;
  return Math.max(0.35, Math.min(0.9, scale));
}

function scaleInt(value: number, scale: number) {
  return Math.max(0, Math.round(value * scale));
}

export async function getOperationsAnalyticsKpis(
  filters?: OperationsAnalyticsFilters,
): Promise<OperationsAnalyticsKpis> {
  const [inspections, logins, devices] = await Promise.all([
    getInspectionKpis(),
    getLoginKpis(),
    getDeviceKpis(),
  ]);
  const scale = getFilterScale(filters);
  return {
    inspections: {
      totalInspections: scaleInt(inspections.totalInspections, scale),
      inboundInReview: scaleInt(inspections.inboundInReview, scale),
      inboundRejected: scaleInt(inspections.inboundRejected, scale),
      inboundApproved: scaleInt(inspections.inboundApproved, scale),
      outboundInReview: scaleInt(inspections.outboundInReview, scale),
      outboundRejected: scaleInt(inspections.outboundRejected, scale),
      outboundApproved: scaleInt(inspections.outboundApproved, scale),
      inboundPassed: scaleInt(inspections.inboundPassed, scale),
      inboundFailed: scaleInt(inspections.inboundFailed, scale),
      outboundPassed: scaleInt(inspections.outboundPassed, scale),
      outboundFailed: scaleInt(inspections.outboundFailed, scale),
    },
    logins: {
      ...logins,
      totalLogins: scaleInt(logins.totalLogins, scale),
      successfulLogins: scaleInt(logins.successfulLogins, scale),
      failedLogins: scaleInt(logins.failedLogins, scale),
      uniqueUsers: scaleInt(logins.uniqueUsers, Math.min(1, scale + 0.1)),
    },
    devices: {
      ...devices,
      totalDevices: scaleInt(devices.totalDevices, scale),
      activeDevices: scaleInt(devices.activeDevices, scale),
      mobileDevices: scaleInt(devices.mobileDevices, scale),
      desktopDevices: scaleInt(devices.desktopDevices, scale),
    },
  };
}

/** Weekly trend for charts (mock). */
export interface OperationsTrendPoint {
  week: string;
  inspections: number;
  logins: number;
  devices: number;
}

const operationsTrendData: OperationsTrendPoint[] = [
  { week: "W1", inspections: 320, logins: 280, devices: 44 },
  { week: "W2", inspections: 358, logins: 310, devices: 46 },
  { week: "W3", inspections: 342, logins: 295, devices: 45 },
  { week: "W4", inspections: 380, logins: 335, devices: 48 },
  { week: "W5", inspections: 365, logins: 318, devices: 47 },
  { week: "W6", inspections: 398, logins: 342, devices: 50 },
];

export async function getOperationsTrend(): Promise<OperationsTrendPoint[]> {
  return new Promise((r) => setTimeout(() => r([...operationsTrendData]), 300));
}

/** Summary by category for the side card (current period totals). */
export interface OperationsSummaryByCategory {
  name: string;
  value: number;
  fill?: string;
}

export async function getOperationsTrendFiltered(
  filters?: OperationsAnalyticsFilters,
): Promise<OperationsTrendPoint[]> {
  const scale = getFilterScale(filters);
  const base = await getOperationsTrend();
  return base.map((p) => ({
    ...p,
    inspections: scaleInt(p.inspections, scale),
    logins: scaleInt(p.logins, scale),
    devices: scaleInt(p.devices, scale),
  }));
}

export async function getOperationsSummaryByCategory(
  filters?: OperationsAnalyticsFilters,
): Promise<OperationsSummaryByCategory[]> {
  const scale = getFilterScale(filters);
  return new Promise((r) =>
    setTimeout(
      () =>
        r([
          { name: "Inspections", value: scaleInt(2163, scale), fill: "var(--chart-1)" },
          { name: "Logins", value: scaleInt(342, scale), fill: "var(--chart-2)" },
          { name: "Devices", value: scaleInt(48, scale), fill: "var(--chart-3)" },
        ]),
      200,
    ),
  );
}
