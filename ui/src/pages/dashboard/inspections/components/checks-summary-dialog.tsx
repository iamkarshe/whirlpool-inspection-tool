import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InspectionQuestionResultsTable } from "@/pages/dashboard/inspections/components/inspection-question-results-table";
import type {
  InspectionQuestionResult,
  InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";

type ChecksDialogMode = "failed" | "passed";

function titleForMode(mode: ChecksDialogMode) {
  return mode === "failed" ? "Failed checks" : "Passed checks";
}

function sectionTitle(section: InspectionSectionKey) {
  if (section === "outer-packaging") return "Outer packaging";
  if (section === "inner-packaging") return "Inner packaging";
  return "Product";
}

export function ChecksSummaryDialog({
  open,
  onOpenChange,
  mode,
  onModeChange,
  reviewCounts,
  sectionRows,
  onViewImages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChecksDialogMode;
  onModeChange: (mode: ChecksDialogMode) => void;
  reviewCounts: { passed: number; failed: number };
  sectionRows: {
    outer: InspectionQuestionResult[];
    inner: InspectionQuestionResult[];
    product: InspectionQuestionResult[];
  };
  onViewImages: (row: InspectionQuestionResult) => void;
}) {
  const title = titleForMode(mode);

  const checksBySection = useMemo(() => {
    const predicate =
      mode === "failed"
        ? (r: InspectionQuestionResult) => r.status === "fail"
        : (r: InspectionQuestionResult) => r.status === "pass";
    return {
      outer: sectionRows.outer.filter(predicate),
      inner: sectionRows.inner.filter(predicate),
      product: sectionRows.product.filter(predicate),
    };
  }, [mode, sectionRows.inner, sectionRows.outer, sectionRows.product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden"
        style={{ width: "70vw", maxWidth: "none" }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Grouped by section so you can spot issues quickly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-3">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={mode === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("failed")}
              >
                Failed ({reviewCounts.failed})
              </Button>
              <Button
                type="button"
                variant={mode === "passed" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange("passed")}
              >
                Passed ({reviewCounts.passed})
              </Button>
              <Badge variant="outline" className="ms-auto text-xs font-normal">
                Click “View” to open images
              </Badge>
            </div>

            {(
              [
                ["outer-packaging", checksBySection.outer],
                ["inner-packaging", checksBySection.inner],
                ["product", checksBySection.product],
              ] as const
            ).map(([section, rows]) => (
              <Card key={section} className="gap-3 py-3">
                <CardHeader className="px-3">
                  <CardTitle className="text-base">
                    {sectionTitle(section)} ({rows.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <InspectionQuestionResultsTable
                    rows={rows}
                    onViewImages={onViewImages}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
