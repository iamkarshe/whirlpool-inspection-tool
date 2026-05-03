import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { deriveIsUnderReviewFromReviewStatus } from "@/services/inspections-api";

import type { OpsInspectionListMetric } from "@/lib/ops-inspection-list-query";

export function filterInspectionsByMetric(
  rows: Inspection[],
  metric: OpsInspectionListMetric,
): Inspection[] {
  if (metric === "total") return rows;
  return rows.filter((i) => {
    const rs = (i.review_status ?? "").toLowerCase();
    if (metric === "in_review") {
      return (
        i.is_under_review === true ||
        deriveIsUnderReviewFromReviewStatus(i.review_status ?? "")
      );
    }
    if (metric === "approved") {
      return (
        /approv/.test(rs) &&
        !deriveIsUnderReviewFromReviewStatus(i.review_status ?? "")
      );
    }
    if (metric === "rejected") {
      return /reject/.test(rs);
    }
    return true;
  });
}
