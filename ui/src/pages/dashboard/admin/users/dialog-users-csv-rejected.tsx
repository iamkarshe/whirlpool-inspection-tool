import { FileDown } from "lucide-react";

import type { UserCsvUpsertResponse } from "@/api/generated/model/userCsvUpsertResponse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadRejectedUsersCsv } from "@/services/users-api";

export type DialogUsersCsvRejectedProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: UserCsvUpsertResponse | null;
};

function importSummary(result: UserCsvUpsertResponse): string {
  const parts: string[] = [];
  if (result.created > 0) {
    parts.push(`${result.created} created`);
  }
  if (result.updated > 0) {
    parts.push(`${result.updated} updated`);
  }
  if (result.rejected > 0) {
    parts.push(`${result.rejected} rejected`);
  }
  return parts.length > 0 ? parts.join(", ") : "No rows were imported.";
}

export function DialogUsersCsvRejected({
  open,
  onOpenChange,
  result,
}: DialogUsersCsvRejectedProps) {
  const rows = result?.rejected_rows ?? [];
  const rejectedCsv = result?.rejected_csv?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="space-y-2 px-6 pt-6">
          <DialogTitle>CSV import errors</DialogTitle>
          <DialogDescription>
            {result
              ? `${importSummary(result)}. Fix the rows below and re-upload the corrected CSV.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Warehouses</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.row_number}-${row.email}-${row.name}`}>
                    <TableCell>{row.row_number}</TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.email || "—"}</TableCell>
                    <TableCell>{row.mobile || "—"}</TableCell>
                    <TableCell>{row.role || "—"}</TableCell>
                    <TableCell>{row.designation || "—"}</TableCell>
                    <TableCell>{row.allowed_warehouse || "—"}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-destructive">
                      {row.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              No rejected row details were returned. Download the rejected CSV if
              available, fix the issues, and try again.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 px-6 pb-6 sm:justify-between">
          {rejectedCsv ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadRejectedUsersCsv(rejectedCsv)}
            >
              <FileDown className="mr-1 h-4 w-4" />
              Download rejected CSV
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
