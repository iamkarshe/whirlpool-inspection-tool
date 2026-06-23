import { useEffect, useMemo, useState } from "react";

import { AppliedDateRangePicker } from "@/components/applied-date-range-picker";
import { SegmentedFilterGroup } from "@/components/filters/segmented-filter-group";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { useAppliedDateRange } from "@/hooks/use-applied-date-range";
import type { FilterOption } from "@/api/generated/model/filterOption";
import JobLogsDataTable from "@/pages/dashboard/admin/job-logs/data-table";
import { RunAutoApproveJobDialog } from "@/pages/dashboard/admin/job-logs/run-auto-approve-job-dialog";
import {
  fetchJobLogFilters,
  fetchJobLogsPage,
  logsApiErrorMessage,
  toApiDate,
  type JobLogRow,
} from "@/services/logs-api";

const JOB_LOG_SORT = {
  allowedColumns: [
    "id",
    "job_name",
    "status",
    "rows_updated",
    "created_at",
    "updated_at",
  ] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

export default function JobLogsPage() {
  const {
    draft: dateRangeDraft,
    applied: dateRange,
    onDraftChange,
    apply: applyDateRange,
    isDirty: dateRangeDirty,
  } = useAppliedDateRange();
  const [jobOptions, setJobOptions] = useState<FilterOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [activeJobName, setActiveJobName] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchJobLogFilters()
      .then((res) => {
        if (!cancelled) {
          setJobOptions(res.job_names ?? []);
          setFiltersError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFiltersError(
            logsApiErrorMessage(err, "Could not load job log filters."),
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

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;
  const dataScopeKey = `${dateFrom ?? ""}|${dateTo ?? ""}|${activeStatus ?? ""}|${activeJobName ?? ""}|${logsRefreshKey}`;

  const activeJobLabel = useMemo(() => {
    if (!activeJobName) return null;
    return (
      jobOptions.find((option) => option.value === activeJobName)?.label ??
      activeJobName
    );
  }, [activeJobName, jobOptions]);

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<JobLogRow>({
      initialSorting: [{ id: "created_at", desc: true }],
      dataScopeKey,
      refreshKey: logsRefreshKey,
      errorMessage: "Failed to load job logs.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          JOB_LOG_SORT,
        );
        return fetchJobLogsPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            date_field: dateFrom || dateTo ? "created_at" : null,
            date_from: dateFrom,
            date_to: dateTo,
            status: activeStatus,
            job_name: activeJobName,
          },
          { signal },
        );
      },
    });

  const emptyMessage = activeJobLabel
    ? `No ${activeJobLabel} job logs in this date range.`
    : "No job logs in this date range.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Job logs"
          description="Cron and background job outcomes."
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AppliedDateRangePicker
            draft={dateRangeDraft}
            onDraftChange={onDraftChange}
            onApply={applyDateRange}
            isDirty={dateRangeDirty}
          />
          <RunAutoApproveJobDialog
            onSuccess={() => setLogsRefreshKey((key) => key + 1)}
          />
        </div>
      </div>

      <SegmentedFilterGroup
        options={jobOptions}
        value={activeJobName}
        kind="job"
        disabled={filtersLoading}
        onChange={(value) => {
          setActiveJobName(value);
          serverSide.onPaginationChange({
            ...serverSide.pagination,
            pageIndex: 0,
          });
        }}
      />

      <SegmentedFilterGroup
        options={STATUS_FILTER_OPTIONS}
        value={activeStatus}
        kind="status"
        size="compact"
        allLabel="All statuses"
        onChange={(value) => {
          setActiveStatus(value);
          serverSide.onPaginationChange({
            ...serverSide.pagination,
            pageIndex: 0,
          });
        }}
      />

      {filtersError ? (
        <p className="text-destructive text-sm">{filtersError}</p>
      ) : null}
      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <JobLogsDataTable
        data={rows}
        serverSide={serverSide}
        isLoading={isLoading || filtersLoading}
        activeJobName={activeJobName}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
