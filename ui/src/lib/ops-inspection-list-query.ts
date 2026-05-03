import { PAGES } from "@/endpoints";

export type OpsInspectionListGroup = "all" | "inbound" | "outbound";

export type OpsInspectionListMetric =
  | "total"
  | "in_review"
  | "approved"
  | "rejected";

const METRICS: OpsInspectionListMetric[] = [
  "total",
  "in_review",
  "approved",
  "rejected",
];

const GROUPS: OpsInspectionListGroup[] = ["all", "inbound", "outbound"];

export function isOpsInspectionListMetric(s: string): s is OpsInspectionListMetric {
  return (METRICS as readonly string[]).includes(s);
}

export function isOpsInspectionListGroup(s: string): s is OpsInspectionListGroup {
  return (GROUPS as readonly string[]).includes(s);
}

export type OpsInspectionListQuery = {
  from: string;
  to: string;
  group: OpsInspectionListGroup;
  metric: OpsInspectionListMetric;
};

export function parseOpsInspectionListQuery(
  params: URLSearchParams,
): OpsInspectionListQuery | null {
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";
  if (!from || !to) return null;
  const groupRaw = params.get("group")?.trim() ?? "all";
  const metricRaw = params.get("metric")?.trim() ?? "total";
  const group = isOpsInspectionListGroup(groupRaw) ? groupRaw : "all";
  const metric = isOpsInspectionListMetric(metricRaw) ? metricRaw : "total";
  return { from, to, group, metric };
}

export function opsInspectionListPath(q: OpsInspectionListQuery): string {
  const p = new URLSearchParams();
  p.set("from", q.from);
  p.set("to", q.to);
  p.set("group", q.group);
  p.set("metric", q.metric);
  return `${PAGES.OPS_INSPECTION_LIST}?${p.toString()}`;
}

export function opsInspectionListTitle(q: OpsInspectionListQuery): string {
  const g =
    q.group === "inbound" ? "Inbound" : q.group === "outbound" ? "Outbound" : "All";
  const m =
    q.metric === "total"
      ? "Total"
      : q.metric === "in_review"
        ? "In review"
        : q.metric === "approved"
          ? "Approved"
          : "Rejected";
  return `${g} · ${m}`;
}
