import type { IssueSeverity } from "@/components/dialogs/raise-issue-dialog";

export type IssueStatus = "open" | "resolved";

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatIssueSeverity(severity: IssueSeverity) {
  return capitalize(String(severity));
}

export function formatIssueStatus(status: IssueStatus) {
  return capitalize(String(status));
}

export function issueSeverityBadgeClass(severity: IssueSeverity) {
  if (severity === "high") return "border-red-300 bg-red-50 text-red-700";
  if (severity === "medium") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}
