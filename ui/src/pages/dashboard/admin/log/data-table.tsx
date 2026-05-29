import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import { LogLevelBadge, LogSourceBadge } from "@/pages/dashboard/admin/log/log-badge";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const logColumns: ColumnDef<ApplicationLogRow>[] = [
  {
    accessorKey: "level",
    meta: { align: "left" },
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
    cell: ({ row }) => <LogLevelBadge level={row.original.levelKey} />,
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
      <span className="max-w-[360px] truncate text-sm" title={row.original.message}>
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
  {
    id: "actions",
    enableHiding: false,
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link
          to={PAGES.logViewPath(row.original.uuid)}
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

const logFilters: DataTableFilter<ApplicationLogRow>[] = [
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
      { value: "AUTH", label: "Auth" },
      { value: "USER ADD", label: "User add" },
      { value: "USER UPDATE", label: "User update" },
      { value: "MASTER UPDATE", label: "Master update" },
      {
        value: "INTEGRATION KEY UPDATED",
        label: "Integration key updated",
      },
    ],
  },
];

interface LogsDataTableProps {
  data: ApplicationLogRow[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function LogsDataTable({
  data,
  serverSide,
  isLoading,
}: LogsDataTableProps) {
  return (
    <DataTable<ApplicationLogRow>
      columns={logColumns}
      data={data}
      filters={logFilters}
      rangeLabel="logs"
      isLoading={isLoading ?? false}
      serverSide={serverSide}
      showDateRangePicker={false}
    />
  );
}
