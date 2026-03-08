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

export async function getOperationsAnalyticsKpis(): Promise<OperationsAnalyticsKpis> {
  const [inspections, logins, devices] = await Promise.all([
    getInspectionKpis(),
    getLoginKpis(),
    getDeviceKpis(),
  ]);
  return { inspections, logins, devices };
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

export async function getOperationsSummaryByCategory(): Promise<OperationsSummaryByCategory[]> {
  return new Promise((r) =>
    setTimeout(
      () =>
        r([
          { name: "Inspections", value: 2163, fill: "var(--chart-1)" },
          { name: "Logins", value: 342, fill: "var(--chart-2)" },
          { name: "Devices", value: 48, fill: "var(--chart-3)" },
        ]),
      200,
    ),
  );
}
