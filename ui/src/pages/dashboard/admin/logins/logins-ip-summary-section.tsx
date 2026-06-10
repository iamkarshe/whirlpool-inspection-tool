import { useMemo } from "react";
import type { DateRange } from "react-day-picker";

import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import LoginIpSummaryDataTable from "@/pages/dashboard/admin/logins/ip-summary-data-table";
import type { LoginIpSummaryRow } from "@/pages/dashboard/admin/logins/login-types";
import { formatCalendarDateForApi } from "@/services/inspections-api";
import { fetchLoginIpSummaryPage } from "@/services/logins-api";

const IP_SUMMARY_SORT = {
  allowedColumns: [
    "ip_address",
    "total_logins",
    "successful_logins",
    "failed_logins",
    "unique_users",
    "last_seen_at",
    "first_seen_at",
  ] as const,
  defaultSort: { sort_by: "last_seen_at", sort_dir: "desc" as const },
};

function listDateParams(dateRange?: DateRange) {
  if (!dateRange?.from) return {};
  return {
    date_field: "logged_at" as const,
    date_from: formatCalendarDateForApi(dateRange.from),
    date_to: formatCalendarDateForApi(dateRange.to ?? dateRange.from),
  };
}

export function LoginsIpSummarySection({
  dateRange,
  abusiveOnly,
  onAbusiveOnlyChange,
}: {
  dateRange?: DateRange;
  abusiveOnly: boolean;
  onAbusiveOnlyChange: (value: boolean) => void;
}) {
  const dataScopeKey = useMemo(
    () =>
      JSON.stringify({
        abusiveOnly,
        from: dateRange?.from?.toISOString() ?? "",
        to: dateRange?.to?.toISOString() ?? "",
      }),
    [abusiveOnly, dateRange],
  );

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<LoginIpSummaryRow>({
      initialSorting: [{ id: "last_seen_at", desc: true }],
      dataScopeKey,
      errorMessage: "Failed to load IP summary.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          IP_SUMMARY_SORT,
        );
        return fetchLoginIpSummaryPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            abusive_only: abusiveOnly,
            ...listDateParams(dateRange),
          },
          { signal },
        );
      },
    });

  const serverSideWithFilters = useMemo(
    () => ({
      ...serverSide,
      filters: { is_abusive: abusiveOnly ? "true" : "false" },
      onFilterChange: (id: string, value: string) => {
        if (id !== "is_abusive") return;
        onAbusiveOnlyChange(value === "true");
        serverSide.onPaginationChange({
          ...serverSide.pagination,
          pageIndex: 0,
        });
      },
    }),
    [serverSide, abusiveOnly, onAbusiveOnlyChange],
  );

  return (
    <>
      {error && !isLoading ? (
        <p className="text-destructive mb-3 text-sm">{error}</p>
      ) : null}
      <LoginIpSummaryDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
      />
    </>
  );
}
