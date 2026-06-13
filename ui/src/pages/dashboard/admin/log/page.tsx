import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { SegmentedFilterGroup } from "@/components/filters/segmented-filter-group";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import type { FilterOption } from "@/api/generated/model/filterOption";
import LogsDataTable from "@/pages/dashboard/admin/log/data-table";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import {
  fetchApplicationLogFilters,
  fetchApplicationLogsPage,
  logsApiErrorMessage,
  toApiDate,
} from "@/services/logs-api";

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
  const [sourceOptions, setSourceOptions] = useState<FilterOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    level: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetchApplicationLogFilters()
      .then((res) => {
        if (!cancelled) {
          setSourceOptions(res.sources ?? []);
          setFiltersError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFiltersError(
            logsApiErrorMessage(err, "Could not load log source filters."),
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
  const dataScopeKey = `${dateFrom ?? ""}|${dateTo ?? ""}|${apiFilters.level}|${activeSource ?? ""}`;

  const activeSourceLabel = useMemo(() => {
    if (!activeSource) return null;
    return (
      sourceOptions.find((option) => option.value === activeSource)?.label ??
      activeSource
    );
  }, [activeSource, sourceOptions]);

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
            source: activeSource,
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

  const emptyMessage = activeSourceLabel
    ? `No ${activeSourceLabel} logs in this date range.`
    : "No logs in this date range.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Logs"
          description="Application and audit logs for the application."
        />
        <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <SegmentedFilterGroup
        options={sourceOptions}
        value={activeSource}
        kind="source"
        disabled={filtersLoading}
        onChange={(value) => {
          setActiveSource(value);
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

      <LogsDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading || filtersLoading}
        activeSource={activeSource}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
