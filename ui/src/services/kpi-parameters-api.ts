import { getReports } from "@/api/generated/reports/reports";
import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";
import type { ReportsDropdownOption } from "@/api/generated/model/reportsDropdownOption";

/** Filter dropdown metadata — single `GET /api/reports/kpi-parameters` (no pagination). */
export async function fetchKpiParameters(opts?: {
  signal?: AbortSignal;
}): Promise<KpiParametersResponse> {
  const reports = getReports();
  return reports.getKpiParametersApiReportsKpiParametersGet(
    opts?.signal ? { signal: opts.signal } : undefined,
  );
}

export function mapKpiDropdownOptions(
  options: ReportsDropdownOption[] | null | undefined,
): Array<{ id: string; label: string }> {
  return (options ?? []).map((o) => ({ id: o.value, label: o.label }));
}
