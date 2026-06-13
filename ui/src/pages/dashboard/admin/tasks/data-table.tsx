import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { TimeDisplay } from "@/components/time-display";
import { DialogTaskDetail } from "@/pages/dashboard/admin/tasks/dialog-task-detail";
import { TaskStatusBadge } from "@/pages/dashboard/admin/tasks/task-badge";
import type { TaskRow } from "@/services/tasks-api";
import type { ColumnDef } from "@tanstack/react-table";

function buildTaskColumns(
  activeTaskType: string | null,
  onView: (task: TaskRow) => void,
): ColumnDef<TaskRow>[] {
  const columns: ColumnDef<TaskRow>[] = [];

  if (!activeTaskType) {
    columns.push({
      accessorKey: "task_type",
      header: "Task type",
      cell: ({ row }) => (
        <span className="block max-w-[180px] truncate font-medium">
          {row.original.task_type}
        </span>
      ),
    });
  }

  columns.push(
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <div className="max-w-[220px] text-sm">
          <p className="font-medium tabular-nums">
            {row.original.progress_percent}%
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {row.original.progress_message?.trim() || "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "created_by",
      header: "Created by",
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate text-sm">
          {row.original.created_by?.trim() || "—"}
        </span>
      ),
    },
    {
      id: "attempts",
      header: "Attempts",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.attempts}/{row.original.max_attempts}
        </span>
      ),
    },
    {
      accessorKey: "error_message",
      header: "Error",
      cell: ({ row }) => {
        const text = row.original.error_message?.trim();
        return (
          <span
            className="text-destructive block max-w-[200px] truncate text-xs"
            title={text}
          >
            {text || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      meta: { align: "right" },
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
          <Button variant="ghost" size="sm" onClick={() => onView(row.original)}>
            View
          </Button>
        </div>
      ),
    },
  );

  return columns;
}

interface TasksDataTableProps {
  data: TaskRow[];
  isLoading?: boolean;
  activeTaskType: string | null;
  emptyMessage?: string;
}

export function TasksDataTable({
  data,
  isLoading,
  activeTaskType,
  emptyMessage,
}: TasksDataTableProps) {
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleView = (task: TaskRow) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => buildTaskColumns(activeTaskType, handleView),
    [activeTaskType],
  );

  const showEmptyHint =
    !isLoading && data.length === 0 && emptyMessage && emptyMessage.length > 0;

  return (
    <>
      <DataTable<TaskRow>
        columns={columns}
        data={data}
        rangeLabel="tasks"
        isLoading={isLoading ?? false}
        showDateRangePicker={false}
      />
      {showEmptyHint ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {emptyMessage}
        </p>
      ) : null}
      <DialogTaskDetail
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
      />
    </>
  );
}
