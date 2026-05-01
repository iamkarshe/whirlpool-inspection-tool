import type { ChecklistGroupBlock } from "@/api/generated/model/checklistGroupBlock";
import type { InspectionMetadataResponse } from "@/api/generated/model/inspectionMetadataResponse";

export function toDatetimeLocalValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type InspectionStartMode = "inbound" | "outbound";

export type OpsInspectionSharedFormData = {
  metadata: InspectionMetadataResponse | null;
  checklistGroups: ChecklistGroupBlock[];
  loading: boolean;
};
