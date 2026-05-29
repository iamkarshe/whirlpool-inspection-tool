import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { formatDate } from "@/lib/core";
import { JobLogStatusBadge } from "@/pages/dashboard/admin/job-logs/job-log-badge";
import type { JobLogRow } from "@/services/logs-api";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

function buildJobLogColumns(
  onView: (log: JobLogRow) => void,
): ColumnDef<JobLogRow>[] {
  return [
    {
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
        <span className="block max-w-[140px] truncate font-medium">
          {row.original.job_name}
        </span>
      ),
    },
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
            className="block max-w-[200px] truncate text-sm text-muted-foreground"
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
          Time
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="block text-right font-mono text-xs tabular-nums whitespace-nowrap">
          {formatDate(row.original.created_at)}
        </span>
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
            aria-label="View job log details"
          >
            View
          </Button>
        </div>
      ),
    },
  ];
}

const jobLogFilters: DataTableFilter<JobLogRow>[] = [
  {
    id: "status",
    title: "Status",
    options: [
      { value: "success", label: "Success" },
      { value: "failed", label: "Failed" },
    ],
  },
];

interface JobLogsDataTableProps {
  data: JobLogRow[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

function JobLogsDataTable({
  data,
  serverSide,
  isLoading,
}: JobLogsDataTableProps) {
  const [selectedLog, setSelectedLog] = useState<JobLogRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleView = (log: JobLogRow) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const columns = buildJobLogColumns(handleView);

  return (
    <>
      <DataTable<JobLogRow>
        columns={columns}
        data={data}
        filters={jobLogFilters}
        rangeLabel="job logs"
        isLoading={isLoading ?? false}
        serverSide={serverSide}
        showDateRangePicker={false}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job log details</DialogTitle>
          </DialogHeader>
          {selectedLog ? (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs tabular-nums">
                  {selectedLog.id}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">UUID</span>
                <span className="font-mono text-xs break-all">
                  {selectedLog.uuid}
                </span>
              </div>
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
                <span className="text-muted-foreground">Time</span>
                <span className="font-mono text-xs">
                  {formatDate(selectedLog.created_at)}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Message</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedLog.message?.trim() || "—"}
                </p>
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
