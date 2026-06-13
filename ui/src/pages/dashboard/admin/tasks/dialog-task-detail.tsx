import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { TaskDetailResponse } from "@/api/generated/model/taskDetailResponse";
import type { TaskRow } from "@/services/tasks-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/core";
import { TaskStatusBadge } from "@/pages/dashboard/admin/tasks/task-badge";
import { fetchTaskDetail, tasksApiErrorMessage } from "@/services/tasks-api";

export type DialogTaskDetailProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow | null;
};

function TaskDetailBody({ taskUuid }: { taskUuid: string }) {
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchTaskDetail(taskUuid)
      .then((response) => {
        if (!cancelled) setDetail(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(tasksApiErrorMessage(err, "Could not load task details."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [taskUuid]);

  const loading = detail === null && error === null;
  const displayFields = detail?.display_fields ?? [];

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm">
        <Loader2 className="size-5 animate-spin" />
        Loading task…
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!detail) return null;

  return (
    <div className="grid gap-4 py-2 text-sm">
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <span className="text-muted-foreground">Status</span>
        <TaskStatusBadge status={detail.status} />
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <span className="text-muted-foreground">Progress</span>
        <span>
          {detail.progress_percent}% —{" "}
          {detail.progress_message?.trim() || "—"}
        </span>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <span className="text-muted-foreground">Created by</span>
        <span>{detail.created_by?.trim() || "—"}</span>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <span className="text-muted-foreground">Attempts</span>
        <span>
          {detail.attempts} / {detail.max_attempts}
        </span>
      </div>
      {detail.error_message ? (
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="text-muted-foreground">Error</span>
          <p className="text-destructive whitespace-pre-wrap break-words">
            {detail.error_message}
          </p>
        </div>
      ) : null}
      {detail.result_message ? (
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="text-muted-foreground">Result</span>
          <p className="whitespace-pre-wrap break-words">
            {detail.result_message}
          </p>
        </div>
      ) : null}

      {displayFields.length > 0 ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Details</p>
          <dl className="grid gap-2">
            {displayFields.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-[140px_1fr] gap-2 text-sm"
              >
                <dt className="text-muted-foreground">{field.tag}</dt>
                <dd className="break-words">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

export function DialogTaskDetail({
  open,
  onOpenChange,
  task,
}: DialogTaskDetailProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task details</DialogTitle>
          {task ? (
            <DialogDescription>
              {task.task_type} · {formatDate(task.created_at)}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {open && task ? <TaskDetailBody key={task.uuid} taskUuid={task.uuid} /> : null}
      </DialogContent>
    </Dialog>
  );
}
