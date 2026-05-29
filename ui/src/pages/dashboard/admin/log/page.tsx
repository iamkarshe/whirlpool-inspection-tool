import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import LogsDataTable from "@/pages/dashboard/admin/log/data-table";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import { fetchApplicationLogsPage, toApiDate } from "@/services/logs-api";

const APPLICATION_LOG_SORT = {
  allowedColumns: [
    "id",
    "level",
    "message",
    "source",
    "created_at",
    "time",
  ] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

export default function LogsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    level: "",
    source: "",
  });

  const dateFrom = dateRange?.from ? toApiDate(dateRange.from) : null;
  const dateTo = dateRange?.to ? toApiDate(dateRange.to) : null;
  const dataScopeKey = `${dateFrom ?? ""}|${dateTo ?? ""}|${apiFilters.level}|${apiFilters.source}`;

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<ApplicationLogRow>({
      initialSorting: [{ id: "created_at", desc: true }],
      dataScopeKey,
      errorMessage: "Failed to load logs.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          APPLICATION_LOG_SORT,
        );
        const level = apiFilters.level?.trim();
        const source = apiFilters.source?.trim();
        return fetchApplicationLogsPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            date_field: dateFrom || dateTo ? "created_at" : null,
            date_from: dateFrom,
            date_to: dateTo,
            level: level || null,
            source: source || null,
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
        <PageActionBar
          title="Logs"
          description="Application and audit logs for the application."
        />
        <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <LogsDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
      />
    </div>
  );
}
