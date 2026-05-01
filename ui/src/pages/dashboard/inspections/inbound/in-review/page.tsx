import { inspectionScopePresets } from "@/pages/dashboard/inspections/inspection-scope-config";
import { InspectionsScopedListPage } from "@/pages/dashboard/inspections/inspections-scoped-list-page";

export default function InboundInReviewInspectionsPage() {
  return (
    <InspectionsScopedListPage
      config={inspectionScopePresets.inboundInReview}
    />
  );
}
