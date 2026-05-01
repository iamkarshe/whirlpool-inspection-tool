import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";

export type InspectionReviewLane = "in_review" | "rejected" | "approved";

export function inspectionMatchesReviewLane(
  inspection: Inspection,
  lane?: InspectionReviewLane,
): boolean {
  if (!lane) return true;
  const rs = (inspection.review_status ?? "").toLowerCase().trim();
  if (lane === "in_review") {
    if (inspection.is_under_review === true) return true;
    if (!rs) return false;
    if (rs.includes("approv")) return false;
    if (rs.includes("reject")) return false;
    return (
      rs.includes("pending") ||
      rs.includes("review") ||
      rs.includes("queued") ||
      rs === "submitted"
    );
  }
  if (lane === "rejected") {
    return rs.includes("reject") || rs === "failed";
  }
  if (lane === "approved") {
    return rs.includes("approv") || rs === "completed" || rs === "accepted";
  }
  return true;
}
