import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import type {
  LoginActivity,
  LoginKpiFilter,
} from "@/pages/dashboard/admin/logins/login-types";
import { formatCalendarDateForApi } from "@/services/inspections-api";
import { fetchLoginsPage } from "@/services/logins-api";

const LOGIN_LIST_SORT = {
  allowedColumns: [
    "id",
    "user_name",
    "email",
    "logged_at",
    "ip_address",
    "status",
    "device_source",
    "login_method",
  ] as const,
  defaultSort: { sort_by: "logged_at", sort_dir: "desc" as const },
};

function listDateParams(dateRange?: DateRange) {
  if (!dateRange?.from) return {};
  return {
    date_field: "logged_at" as const,
    date_from: formatCalendarDateForApi(dateRange.from),
    date_to: formatCalendarDateForApi(dateRange.to ?? dateRange.from),
  };
}

export function LoginsActivitySection({
  dateRange,
  statusFilter,
  onStatusFilterChange,
}: {
  dateRange?: DateRange;
  statusFilter: LoginKpiFilter;
  onStatusFilterChange: (filter: LoginKpiFilter) => void;
}) {
  const dataScopeKey = useMemo(
    () =>
      JSON.stringify({
        statusFilter,
        from: dateRange?.from?.toISOString() ?? "",
        to: dateRange?.to?.toISOString() ?? "",
      }),
    [statusFilter, dateRange],
  );

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<LoginActivity>({
      initialSorting: [{ id: "logged_at", desc: true }],
      dataScopeKey,
      errorMessage: "Failed to load logins.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          LOGIN_LIST_SORT,
        );
        return fetchLoginsPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            status: statusFilter || null,
            ...listDateParams(dateRange),
          },
          { signal },
        );
      },
    });

  const serverSideWithFilters = useMemo(
    () => ({
      ...serverSide,
      filters: { status: statusFilter },
      onFilterChange: (id: string, value: string) => {
        if (id !== "status") return;
        const next =
          value === "successful" || value === "failed"
            ? (value as LoginKpiFilter)
            : "";
        onStatusFilterChange(next);
        serverSide.onPaginationChange({
          ...serverSide.pagination,
          pageIndex: 0,
        });
      },
    }),
    [serverSide, statusFilter, onStatusFilterChange],
  );

  return (
    <>
      {error && !isLoading ? (
        <p className="text-destructive mb-3 text-sm">{error}</p>
      ) : null}
      <LoginsDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
      />
    </>
  );
}
