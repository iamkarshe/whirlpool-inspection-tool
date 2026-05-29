import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import JobLogsDataTable from "@/pages/dashboard/admin/job-logs/data-table";
import {
  fetchJobLogsPage,
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

export default function JobLogsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    status: "",
  });

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;
  const dataScopeKey = `${dateFrom ?? ""}|${dateTo ?? ""}|${apiFilters.status}`;

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<JobLogRow>({
      initialSorting: [{ id: "created_at", desc: true }],
      dataScopeKey,
      errorMessage: "Failed to load job logs.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          JOB_LOG_SORT,
        );
        const status = apiFilters.status?.trim();
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
            status: status || null,
          },
          { signal },
        );
      },
    });

  const serverSideWithFilters = useMemo(
    () => ({
      ...serverSide,
      filters: apiFilters,
      onFilterChange: (id: string, value: string) => {
        setApiFilters((prev) => ({ ...prev, [id]: value }));
        serverSide.onPaginationChange({
          ...serverSide.pagination,
          pageIndex: 0,
        });
      },
    }),
    [apiFilters, serverSide],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar title="Job logs" description="Cron job logs." />
        <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <JobLogsDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
      />
    </div>
  );
}
