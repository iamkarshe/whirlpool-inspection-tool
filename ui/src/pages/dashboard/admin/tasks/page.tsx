import { useEffect, useMemo, useState } from "react";

import { SegmentedFilterGroup } from "@/components/filters/segmented-filter-group";
import PageActionBar from "@/components/page-action-bar";
import type { FilterOption } from "@/api/generated/model/filterOption";
import { TasksDataTable } from "@/pages/dashboard/admin/tasks/data-table";
import {
  fetchTaskFilters,
  fetchTasksList,
  tasksApiErrorMessage,
  type TaskRow,
} from "@/services/tasks-api";

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "retrying", label: "Retrying" },
  { value: "cancelled", label: "Cancelled" },
];

export default function TasksPage() {
  const [taskTypeOptions, setTaskTypeOptions] = useState<FilterOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [activeTaskType, setActiveTaskType] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTaskFilters()
      .then((res) => {
        if (!cancelled) {
          setTaskTypeOptions(res.task_types ?? []);
          setFiltersError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFiltersError(
            tasksApiErrorMessage(err, "Could not load task type filters."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setFiltersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTasksList({
      task_type: activeTaskType,
      status: activeStatus,
    })
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setListError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListError(tasksApiErrorMessage(err, "Failed to load tasks."));
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTaskType, activeStatus]);

  const activeTaskLabel = useMemo(() => {
    if (!activeTaskType) return null;
    return (
      taskTypeOptions.find((option) => option.value === activeTaskType)
        ?.label ?? activeTaskType
    );
  }, [activeTaskType, taskTypeOptions]);

  const emptyMessage = activeTaskLabel
    ? `No ${activeTaskLabel} tasks match the current filters.`
    : "No background tasks match the current filters.";

  return (
    <div className="space-y-4">
      <PageActionBar
        title="Tasks"
        description="Recent background tasks (newest 50)."
      />

      <SegmentedFilterGroup
        options={taskTypeOptions}
        value={activeTaskType}
        kind="task"
        disabled={filtersLoading}
        onChange={(value) => {
          setListLoading(true);
          setActiveTaskType(value);
        }}
      />

      <SegmentedFilterGroup
        options={STATUS_FILTER_OPTIONS}
        value={activeStatus}
        kind="status"
        size="compact"
        allLabel="All statuses"
        onChange={(value) => {
          setListLoading(true);
          setActiveStatus(value);
        }}
      />

      {filtersError ? (
        <p className="text-destructive text-sm">{filtersError}</p>
      ) : null}
      {listError && !listLoading ? (
        <p className="text-destructive text-sm">{listError}</p>
      ) : null}

      <TasksDataTable
        data={rows}
        isLoading={listLoading || filtersLoading}
        activeTaskType={activeTaskType}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
