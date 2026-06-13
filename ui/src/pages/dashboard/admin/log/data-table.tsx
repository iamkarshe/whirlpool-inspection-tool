import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { formatDate } from "@/lib/core";
import { DialogApplicationLogDetail } from "@/pages/dashboard/admin/log/dialog-application-log-detail";
import { LogLevelBadge, LogSourceBadge } from "@/pages/dashboard/admin/log/log-badge";
import {
  readLogDetailBoolean,
  readLogDetailString,
  sourceTabMatchesRow,
} from "@/pages/dashboard/admin/log/log-details-utils";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

function detailColumn(
  id: string,
  header: string,
  key: string,
): ColumnDef<ApplicationLogRow> {
  return {
    id,
    header,
    cell: ({ row }) => {
      const value = readLogDetailString(row.original.details, key);
      return (
        <span className="block max-w-[180px] truncate text-sm" title={value ?? undefined}>
          {value ?? "—"}
        </span>
      );
    },
  };
}

function buildLogColumns(
  activeSource: string | null,
  onView: (log: ApplicationLogRow) => void,
): ColumnDef<ApplicationLogRow>[] {
  const columns: ColumnDef<ApplicationLogRow>[] = [
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
  ];

  if (!activeSource) {
    columns.push({
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
    });
  }

  if (activeSource && sourceTabMatchesRow(activeSource, "AUTH")) {
    columns.push(
      detailColumn("attempted_email", "Email", "attempted_email"),
      detailColumn("ip", "IP", "ip"),
      detailColumn("login_method", "Method", "login_method"),
    );
  }

  if (activeSource && sourceTabMatchesRow(activeSource, "EMAIL")) {
    columns.push(
      detailColumn("to_email", "To", "to_email"),
      detailColumn("subject", "Subject", "subject"),
    );
  }

  if (activeSource && sourceTabMatchesRow(activeSource, "USER_ONBOARD")) {
    columns.push(
      detailColumn("target_email", "User", "target_email"),
      {
        id: "welcome_email_sent",
        header: "Welcome email",
        cell: ({ row }) => {
          const sent = readLogDetailBoolean(row.original.details, "welcome_email_sent");
          if (sent === null) return "—";
          return sent ? "Sent" : "Not sent";
        },
      },
    );
  }

  if (
    activeSource &&
    (sourceTabMatchesRow(activeSource, "USER_ADD") ||
      sourceTabMatchesRow(activeSource, "USER_UPDATE"))
  ) {
    columns.push(
      detailColumn("target_email", "User", "target_email"),
      detailColumn("target_role", "Role", "target_role"),
    );
  }

  columns.push(
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
          >
            View
          </Button>
        </div>
      ),
    },
  );

  return columns;
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
];

interface LogsDataTableProps {
  data: ApplicationLogRow[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
  activeSource: string | null;
  emptyMessage?: string;
}

function LogsDataTable({
  data,
  serverSide,
  isLoading,
  activeSource,
  emptyMessage,
}: LogsDataTableProps) {
  const [selectedLog, setSelectedLog] = useState<ApplicationLogRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleView = (log: ApplicationLogRow) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => buildLogColumns(activeSource, handleView),
    [activeSource],
  );

  const showEmptyHint =
    !isLoading && data.length === 0 && emptyMessage && emptyMessage.length > 0;

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
      {showEmptyHint ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {emptyMessage}
        </p>
      ) : null}
      <DialogApplicationLogDetail
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        log={selectedLog}
        activeSource={activeSource}
      />
    </>
  );
}

export default LogsDataTable;
export { LogsDataTable };
