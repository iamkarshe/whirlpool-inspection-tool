import { Bug, ClipboardCheck, Loader2 } from "lucide-react";

import { DeviceFingerprintLinkBadge } from "@/components/dashboard/device-fingerprint-link-badge";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InspectionChecklistBadge, InspectionProductBadge, InspectionTypeBadge } from "@/pages/dashboard/inspections/inspection-badge";
import type { Inspection, InspectionQuestionResult } from "@/pages/dashboard/inspections/inspection-service";
import { ChecksSummaryDialog } from "@/pages/dashboard/inspections/components/checks-summary-dialog";
import { formatDate } from "@/lib/core";
import { TabsContent } from "@/components/ui/tabs";

type Props = {
  reviewLoading: boolean;
  reviewKpis: KpiCardProps[];
  checksDialogOpen: boolean;
  setChecksDialogOpen: (open: boolean) => void;
  checksDialogMode: "failed" | "passed";
  setChecksDialogMode: (mode: "failed" | "passed") => void;
  reviewSummary: { passed: number; failed: number };
  checksBySection: {
    outer: InspectionQuestionResult[];
    inner: InspectionQuestionResult[];
    product: InspectionQuestionResult[];
  };
  onViewImages: (rows: InspectionQuestionResult) => void;
  inspection: Inspection;
  onRaiseIssue: () => void;
};

export function InspectionOverviewTab({
  reviewLoading,
  reviewKpis,
  checksDialogOpen,
  setChecksDialogOpen,
  checksDialogMode,
  setChecksDialogMode,
  reviewSummary,
  checksBySection,
  onViewImages,
  inspection,
  onRaiseIssue,
}: Props) {
  return (
    <TabsContent value="overview" className="space-y-6">
      <Card className="my-2 gap-3 py-3">
        <CardHeader className="px-3">
          <CardTitle className="text-base">Quality Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          {reviewLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <KpiCardGrid
              cards={reviewKpis}
              className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            />
          )}
        </CardContent>
      </Card>

      <ChecksSummaryDialog
        open={checksDialogOpen}
        onOpenChange={setChecksDialogOpen}
        mode={checksDialogMode}
        onModeChange={setChecksDialogMode}
        reviewCounts={{ passed: reviewSummary.passed, failed: reviewSummary.failed }}
        sectionRows={checksBySection}
        onViewImages={onViewImages}
      />

      <Card className="my-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{inspection.id}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <InspectionChecklistBadge name={inspection.checklist_name} />
                <InspectionProductBadge serial={inspection.product_serial} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Inspector</p>
            <span className="font-medium">{inspection.inspector_name}</span>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Device</p>
            <DeviceFingerprintLinkBadge
              deviceUuid={inspection.device_uuid}
              fingerprint={inspection.device_fingerprint}
            />
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Product</p>
            <p className="font-mono text-sm">{inspection.product_serial}</p>
          </div>
          {inspection.product_category_name ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Product category</p>
              <p className="text-sm">{inspection.product_category_name}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Checklist</p>
            <p className="text-sm">{inspection.checklist_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Type</p>
            <InspectionTypeBadge inspectionType={inspection.inspection_type} />
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Date</p>
            <p className="text-sm">{formatDate(inspection.created_at)}</p>
          </div>
          <div className="space-y-1 pt-2">
            <Button variant="outline" size="sm" onClick={onRaiseIssue}>
              <Bug className="h-4 w-4" />
              Raise an issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
