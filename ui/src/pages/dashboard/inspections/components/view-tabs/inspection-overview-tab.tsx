import { Bug, Loader2 } from "lucide-react";

import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { InspectionDetailInfoSections } from "@/pages/dashboard/inspections/components/inspection-detail-info-sections";
import { ChecksSummaryDialog } from "@/pages/dashboard/inspections/components/checks-summary-dialog";
import type {
  Inspection,
  InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";

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
      <Card className="gap-3 py-3">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-3">
          <CardTitle className="text-base">Quality summary</CardTitle>
          <Button variant="outline" size="sm" onClick={onRaiseIssue}>
            <Bug className="h-4 w-4" />
            Raise an issue
          </Button>
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
        reviewCounts={{
          passed: reviewSummary.passed,
          failed: reviewSummary.failed,
        }}
        sectionRows={checksBySection}
        onViewImages={onViewImages}
      />

      <InspectionDetailInfoSections inspection={inspection} />
    </TabsContent>
  );
}
