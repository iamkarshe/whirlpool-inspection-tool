import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { List, Network } from "lucide-react";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LoginStatCards } from "@/pages/dashboard/admin/logins/components/login-stat-cards";
import { LoginsActivitySection } from "@/pages/dashboard/admin/logins/logins-activity-section";
import { LoginsIpSummarySection } from "@/pages/dashboard/admin/logins/logins-ip-summary-section";
import type { LoginKpiFilter, LoginKpis } from "@/pages/dashboard/admin/logins/login-types";
import { getLoginKpis } from "@/pages/dashboard/admin/logins/login-service";

type LoginsView = "activity" | "ip-summary";

export default function LoginsPage() {
  const [view, setView] = useState<LoginsView>("activity");
  const [kpis, setKpis] = useState<LoginKpis | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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
          <CalendarDateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Button variant="outline" size="sm" type="button">
            Download
          </Button>
        </div>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view}
        onValueChange={(value) => {
          if (value === "activity" || value === "ip-summary") setView(value);
        }}
      >
        <ToggleGroupItem value="activity" className="gap-1.5 px-3">
          <List className="h-3.5 w-3.5" />
          Login activity
        </ToggleGroupItem>
        <ToggleGroupItem value="ip-summary" className="gap-1.5 px-3">
          <Network className="h-3.5 w-3.5" />
          IP summary
        </ToggleGroupItem>
      </ToggleGroup>

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
