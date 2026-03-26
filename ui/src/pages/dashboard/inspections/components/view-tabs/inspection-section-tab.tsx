import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { InspectionQuestionResultsTable } from "@/pages/dashboard/inspections/components/inspection-question-results-table";
import type { InspectionQuestionResult, InspectionSectionKey } from "@/pages/dashboard/inspections/inspection-service";

type Props = {
  value: "outer-packaging" | "inner-packaging" | "product";
  sectionLoading: boolean;
  rows: InspectionQuestionResult[];
  onViewImages: (r: InspectionQuestionResult) => void;
};

function sectionTitle(value: InspectionSectionKey) {
  if (value === "outer-packaging") return "Outer packaging";
  if (value === "inner-packaging") return "Inner packaging";
  return "Product";
}

export function InspectionSectionTab({
  value,
  sectionLoading,
  rows,
  onViewImages,
}: Props) {
  return (
    <TabsContent value={value} className="space-y-4">
      <Card className="gap-3 py-3">
        <CardHeader className="px-3">
          <CardTitle className="text-base">{sectionTitle(value)}</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          {sectionLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InspectionQuestionResultsTable rows={rows} onViewImages={onViewImages} />
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
