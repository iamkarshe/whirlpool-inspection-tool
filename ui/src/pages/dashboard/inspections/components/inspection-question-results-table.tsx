import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InspectionQuestionResult } from "@/pages/dashboard/inspections/inspection-service";

export function InspectionQuestionResultsTable({
  rows,
  emptyLabel = "No checks",
  onViewImages,
}: {
  rows: InspectionQuestionResult[];
  emptyLabel?: string;
  onViewImages: (row: InspectionQuestionResult) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[110px]">Result</TableHead>
            <TableHead>Question</TableHead>
            <TableHead className="w-[40%]">Notes</TableHead>
            <TableHead className="w-[120px] text-right">Images</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-10 text-center"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const isPass = r.status === "pass";
              const rowClass = isPass
                ? "border-l-4 border-l-green-400 bg-green-50/40 hover:bg-green-50/60 dark:bg-green-900/10"
                : "border-l-4 border-l-red-400 bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/10";
              return (
                <TableRow key={r.id} className={rowClass}>
                  <TableCell className="py-2">
                    <span
                      className={
                        isPass
                          ? "inline-flex rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300"
                          : "inline-flex rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300"
                      }
                    >
                      {isPass ? "PASS" : "FAIL"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 whitespace-normal font-medium">
                    {r.question}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 whitespace-normal">
                    {r.notes ?? "—"}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {r.images?.length ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewImages(r)}
                      >
                        View ({r.images.length})
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

