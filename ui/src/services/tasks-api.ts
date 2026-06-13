import { isAxiosError } from "axios";

import { getTasks } from "@/api/generated/tasks/tasks";
import type { HTTPValidationError } from "@/api/generated/model/hTTPValidationError";
import type { ListTasksApiTasksGetParams } from "@/api/generated/model/listTasksApiTasksGetParams";
import type { TaskDetailResponse } from "@/api/generated/model/taskDetailResponse";
import type { TaskFiltersResponse } from "@/api/generated/model/taskFiltersResponse";
import type { TaskListItemResponse } from "@/api/generated/model/taskListItemResponse";

export type TaskRow = TaskListItemResponse;

export type TasksListParams = Pick<
  ListTasksApiTasksGetParams,
  "task_type" | "status"
>;

export function tasksApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : fallback;
  const data = err.response?.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail: unknown }).detail === "string"
  ) {
    const detail = (data as { detail: string }).detail;
    if (detail.length > 0) return detail;
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray((data as HTTPValidationError).detail)
  ) {
    const detail = (data as HTTPValidationError).detail!;
    const first = detail[0]?.msg ?? detail[0]?.type;
    if (typeof first === "string" && first.length > 0) return first;
  }
  if (typeof err.response?.status === "number") {
    return `${fallback} (HTTP ${err.response.status}).`;
  }
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return fallback;
}

export async function fetchTaskFilters(
  request?: { signal?: AbortSignal },
): Promise<TaskFiltersResponse> {
  const api = getTasks();
  return api.getTaskFiltersApiTasksFiltersGet(
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchTasksList(
  params: TasksListParams,
  request?: { signal?: AbortSignal },
): Promise<TaskRow[]> {
  const api = getTasks();
  const res = await api.listTasksApiTasksGet(
    {
      task_type: params.task_type ?? null,
      status: params.status ?? null,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
  return res.data;
}

export async function fetchTaskDetail(
  taskUuid: string,
  request?: { signal?: AbortSignal },
): Promise<TaskDetailResponse> {
  const api = getTasks();
  return api.getTaskApiTasksTaskUuidGet(
    taskUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}
