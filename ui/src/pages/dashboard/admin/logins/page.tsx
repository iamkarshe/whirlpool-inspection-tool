import { useEffect, useMemo, useState } from "react";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import { LoginStatCards } from "@/pages/dashboard/admin/logins/components/login-stat-cards";
import type { LoginActivity, LoginKpis } from "@/pages/dashboard/admin/logins/login-types";
import { getLoginKpis } from "@/pages/dashboard/admin/logins/login-service";
import { fetchLoginsPage } from "@/services/logins-api";

export default function LoginsPage() {
  const [kpis, setKpis] = useState<LoginKpis | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    status: "",
  });

  useEffect(() => {
    setLoadingKpis(true);
    getLoginKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  const LOGIN_LIST_SORT = {
    allowedColumns: [
      "id",
      "user_name",
      "email",
      "logged_at",
      "ip_address",
      "status",
      "device_source",
    ] as const,
    defaultSort: { sort_by: "id", sort_dir: "desc" as const },
  };

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<LoginActivity>({
      initialSorting: [{ id: "logged_at", desc: true }],
      dataScopeKey: apiFilters.status,
      errorMessage: "Failed to load logins.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          LOGIN_LIST_SORT,
        );
        const statusFilter = apiFilters.status;
        return fetchLoginsPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            status:
              statusFilter === "successful" || statusFilter === "failed"
                ? statusFilter
                : null,
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
          title="Logins"
          description="Login activity and authentication events for the selected period."
        />
        <div className="flex items-center gap-2">
          <CalendarDateRangePicker />
          <Button variant="outline" size="sm">
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {loadingKpis ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <LoginStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {error && !isLoading ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <LoginsDataTable
            data={rows}
            serverSide={serverSideWithFilters}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
