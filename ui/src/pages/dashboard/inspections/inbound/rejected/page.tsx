import { inspectionScopePresets } from "@/pages/dashboard/inspections/inspection-scope-config";
import { InspectionsScopedListPage } from "@/pages/dashboard/inspections/inspections-scoped-list-page";

export default function InboundRejectedInspectionsPage() {
  return (
    <InspectionsScopedListPage
      config={inspectionScopePresets.inboundRejected}
    />
  );
}
