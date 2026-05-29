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
import { LogLevelBadge, LogSourceBadge } from "@/pages/dashboard/admin/log/log-badge";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

function buildLogColumns(
  onView: (log: ApplicationLogRow) => void,
): ColumnDef<ApplicationLogRow>[] {
  return [
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
        <span
          className="max-w-[360px] truncate text-sm"
          title={row.original.message}
        >
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
      meta: { align: "right" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(row.original)}
            aria-label="View log details"
          >
            View
          </Button>
        </div>
      ),
    },
  ];
}

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

function LogsDataTable({
  data,
  serverSide,
  isLoading,
}: LogsDataTableProps) {
  const [selectedLog, setSelectedLog] = useState<ApplicationLogRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleView = (log: ApplicationLogRow) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const columns = buildLogColumns(handleView);

  return (
    <>
      <DataTable<ApplicationLogRow>
        columns={columns}
        data={data}
        filters={logFilters}
        rangeLabel="logs"
        isLoading={isLoading ?? false}
        serverSide={serverSide}
        showDateRangePicker={false}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log details</DialogTitle>
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
                <span className="text-muted-foreground">Level</span>
                <LogLevelBadge level={selectedLog.levelKey} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Source</span>
                <LogSourceBadge source={selectedLog.source} />
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
                  {selectedLog.message}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LogsDataTable;
export { LogsDataTable };
