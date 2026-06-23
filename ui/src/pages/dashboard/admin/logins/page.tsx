import { useCallback, useEffect, useState } from "react";

import { AppliedDateRangePicker } from "@/components/applied-date-range-picker";
import { SegmentedFilterGroup } from "@/components/filters/segmented-filter-group";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { useAppliedDateRange } from "@/hooks/use-applied-date-range";
import type { FilterOption } from "@/api/generated/model/filterOption";
import { LoginStatCards } from "@/pages/dashboard/admin/logins/components/login-stat-cards";
import { LoginsActivitySection } from "@/pages/dashboard/admin/logins/logins-activity-section";
import { LoginsIpSummarySection } from "@/pages/dashboard/admin/logins/logins-ip-summary-section";
import type { LoginKpiFilter, LoginKpis } from "@/pages/dashboard/admin/logins/login-types";
import { getLoginKpis } from "@/pages/dashboard/admin/logins/login-service";

type LoginsView = "activity" | "ip-summary";

const LOGIN_VIEW_OPTIONS: FilterOption[] = [
  { value: "activity", label: "Login activity" },
  { value: "ip-summary", label: "IP summary" },
];

export default function LoginsPage() {
  const [view, setView] = useState<LoginsView>("activity");
  const [kpis, setKpis] = useState<LoginKpis | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const {
    draft: dateRangeDraft,
    applied: dateRange,
    onDraftChange,
    apply: applyDateRange,
    isDirty: dateRangeDirty,
  } = useAppliedDateRange();
  const [statusFilter, setStatusFilter] = useState<LoginKpiFilter>("");
  const [abusiveOnly, setAbusiveOnly] = useState(false);
  useEffect(() => {
    setLoadingKpis(true);
    getLoginKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  const handleKpiFilter = useCallback((filter: LoginKpiFilter) => {
    setView("activity");
    setStatusFilter((prev) => (prev === filter ? "" : filter));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Logins"
          description="Login activity, IP geolocation, and abuse investigation."
        />
        <div className="flex items-center gap-2">
          <AppliedDateRangePicker
            draft={dateRangeDraft}
            onDraftChange={onDraftChange}
            onApply={applyDateRange}
            isDirty={dateRangeDirty}
          />
          <Button variant="outline" size="sm" type="button">
            Download
          </Button>
        </div>
      </div>

      <SegmentedFilterGroup
        includeAll={false}
        options={LOGIN_VIEW_OPTIONS}
        value={view}
        kind="view"
        onChange={(next) => {
          if (next === "activity" || next === "ip-summary") setView(next);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {loadingKpis ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <LoginStatCards
              kpis={kpis}
              activeFilter={statusFilter}
              onFilterChange={handleKpiFilter}
            />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {view === "activity" ? (
            <LoginsActivitySection
              dateRange={dateRange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          ) : (
            <LoginsIpSummarySection
              dateRange={dateRange}
              abusiveOnly={abusiveOnly}
              onAbusiveOnlyChange={setAbusiveOnly}
            />
          )}
        </div>
      </div>
    </div>
  );
}
