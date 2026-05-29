import { Button } from "@/components/ui/button";
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

const jobLogColumns: ColumnDef<JobLogRow>[] = [
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
      <span className="font-medium">{row.original.job_name}</span>
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
        Rows updated
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
    cell: ({ row }) => (
      <span
        className="max-w-[320px] truncate text-sm text-muted-foreground"
        title={row.original.message ?? undefined}
      >
        {row.original.message?.trim() || "—"}
      </span>
    ),
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
      <span className="block text-right font-mono text-xs tabular-nums">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
];

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

export default function JobLogsDataTable({
  data,
  serverSide,
  isLoading,
}: JobLogsDataTableProps) {
  return (
    <DataTable<JobLogRow>
      columns={jobLogColumns}
      data={data}
      filters={jobLogFilters}
      rangeLabel="job logs"
      isLoading={isLoading ?? false}
      serverSide={serverSide}
      showDateRangePicker={false}
    />
  );
}
