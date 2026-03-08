import type { Inspection } from "@/pages/dashboard/transactions/inspections/inspection-service";
import { getInspections } from "@/pages/dashboard/transactions/inspections/inspection-service";

export interface DailyInspectionKpis {
  total: number;
  totalChange: string;
  totalChangeType: "positive" | "negative";
  inbound: number;
  inboundChange: string;
  inboundChangeType: "positive" | "negative";
  outbound: number;
  outboundChange: string;
  outboundChangeType: "positive" | "negative";
  uniqueInspectors: number;
  inspectorsChange: string;
  inspectorsChangeType: "positive" | "negative";
}

/** Mock KPIs for the selected date range (e.g. last 7 days). */
export async function getDailyInspectionKpis(
  _dateFrom?: string,
  _dateTo?: string,
): Promise<DailyInspectionKpis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        total: 156,
        totalChange: "+12.4%",
        totalChangeType: "positive",
        inbound: 62,
        inboundChange: "+8.2%",
        inboundChangeType: "positive",
        outbound: 94,
        outboundChange: "+15.1%",
        outboundChangeType: "positive",
        uniqueInspectors: 12,
        inspectorsChange: "+2",
        inspectorsChangeType: "positive",
      });
    }, 400);
  });
}

/** Inspections for the report (optionally filter by date range on client). */
export async function getDailyInspectionReport(
  _dateFrom?: string,
  _dateTo?: string,
): Promise<Inspection[]> {
  const list = await getInspections();
  // In a real app, filter by date range here or via API
  return list;
}
