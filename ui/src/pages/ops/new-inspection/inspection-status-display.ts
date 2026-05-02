import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";

/** Parse response may include `review_status` before OpenAPI types are updated. */
export function readInspectionReviewStatus(
  inspection: object,
): string | null {
  const raw = (inspection as Record<string, unknown>).review_status;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

export function formatReviewStatusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === InspectionReviewStatus.IN_REVIEW) return "In review";
  if (s === InspectionReviewStatus.APPROVED) return "Approved";
  if (s === InspectionReviewStatus.REJECTED) return "Rejected";
  if (s === InspectionReviewStatus.PENDING) return "Pending";
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function reviewStatusBadgeClass(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === InspectionReviewStatus.APPROVED)
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  if (s === InspectionReviewStatus.REJECTED)
    return "border-destructive/40 bg-destructive/10 text-destructive";
  if (s === InspectionReviewStatus.IN_REVIEW)
    return "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100";
  if (s === InspectionReviewStatus.PENDING)
    return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  return "border-border bg-muted/40 text-foreground";
}
