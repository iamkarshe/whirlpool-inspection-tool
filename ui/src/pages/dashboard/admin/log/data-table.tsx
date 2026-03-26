import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { LogLevelBadge, LogSourceBadge } from "@/pages/dashboard/admin/log/log-badge";
import type { Log } from "@/pages/dashboard/admin/log/log-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const logColumns: ColumnDef<Log>[] = [
  {
    accessorKey: "level",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Level
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <LogLevelBadge level={row.original.level} />,
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      return row.getValue("level") === filterValue;
    },
  },
  {
    accessorKey: "message",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Message
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-[320px] truncate text-sm">
        {row.original.message}
      </span>
    ),
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Source
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <LogSourceBadge source={row.original.source} />,
  },
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Time
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatDate(row.original.timestamp)}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link
          to={PAGES.logViewPath(row.original.id)}
          className="gap-1"
          aria-label="View log"
        >
          View
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </Button>
    ),
  },
];

const logFilters: DataTableFilter<Log>[] = [
  {
    id: "level",
    title: "Level",
    options: [
      { value: "info", label: "Info" },
      { value: "warn", label: "Warn" },
      { value: "error", label: "Error" },
    ],
  },
  {
    id: "source",
    title: "Source",
    options: [
      { value: "auth", label: "Auth" },
      { value: "devices", label: "Devices" },
      { value: "inspections", label: "Inspections" },
      { value: "masters", label: "Masters" },
      { value: "reports", label: "Reports" },
      { value: "storage", label: "Storage" },
    ],
  },
];

interface LogsDataTableProps {
  data: Log[];
}

export default function LogsDataTable({ data }: LogsDataTableProps) {
  return (
    <DataTable<Log>
      columns={logColumns}
      data={data}
      searchKey="message"
      filters={logFilters}
      dateRangeFilter={{ dateAccessorKey: "timestamp" }}
      rangeLabel="logs"
    />
  );
}
