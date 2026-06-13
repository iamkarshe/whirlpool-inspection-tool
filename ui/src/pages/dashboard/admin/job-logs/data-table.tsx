import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTable,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { TimeDisplay } from "@/components/time-display";
import { JobLogStatusBadge } from "@/pages/dashboard/admin/job-logs/job-log-badge";
import type { JobLogRow } from "@/services/logs-api";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

function formatMetadata(metadata: JobLogRow["metadata"]): string {
  if (!metadata) return "—";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

function buildJobLogColumns(
  activeJobName: string | null,
  onView: (log: JobLogRow) => void,
): ColumnDef<JobLogRow>[] {
  const columns: ColumnDef<JobLogRow>[] = [];

  if (!activeJobName) {
    columns.push({
      accessorKey: "job_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Job
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="block max-w-[180px] truncate font-medium">
          {row.original.job_name}
        </span>
      ),
    });
  }

  columns.push(
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <JobLogStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "rows_updated",
      meta: { align: "right" },
      header: ({ column }) => (
        <Button
          className="-mr-3 ml-auto flex w-full justify-end"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rows
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.rows_updated.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => {
        const text = row.original.message?.trim() || "—";
        return (
          <span
            className="block max-w-[240px] truncate text-sm text-muted-foreground"
            title={text !== "—" ? text : undefined}
          >
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      meta: { align: "right" },
      header: ({ column }) => (
        <Button
          className="-mr-3 ml-auto flex w-full justify-end"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <TimeDisplay
          iso={row.original.created_at}
          className="block text-right"
        />
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      meta: { align: "right" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(row.original)}
          >
            View
          </Button>
        </div>
      ),
    },
  );

  return columns;
}

interface JobLogsDataTableProps {
  data: JobLogRow[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
  activeJobName: string | null;
  emptyMessage?: string;
}

function JobLogsDataTable({
  data,
  serverSide,
  isLoading,
  activeJobName,
  emptyMessage,
}: JobLogsDataTableProps) {
  const [selectedLog, setSelectedLog] = useState<JobLogRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleView = (log: JobLogRow) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => buildJobLogColumns(activeJobName, handleView),
    [activeJobName],
  );

  const showEmptyHint =
    !isLoading && data.length === 0 && emptyMessage && emptyMessage.length > 0;

  return (
    <>
      <DataTable<JobLogRow>
        columns={columns}
        data={data}
        rangeLabel="job logs"
        isLoading={isLoading ?? false}
        serverSide={serverSide}
        showDateRangePicker={false}
      />
      {showEmptyHint ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {emptyMessage}
        </p>
      ) : null}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job log details</DialogTitle>
          </DialogHeader>
          {selectedLog ? (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Job</span>
                <span className="font-medium break-words">
                  {selectedLog.job_name}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Status</span>
                <JobLogStatusBadge status={selectedLog.status} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Rows updated</span>
                <span className="tabular-nums">
                  {selectedLog.rows_updated.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Date</span>
                <TimeDisplay iso={selectedLog.created_at} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Message</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedLog.message?.trim() || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Metadata
                </p>
                <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {formatMetadata(selectedLog.metadata)}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default JobLogsDataTable;
export { JobLogsDataTable };
