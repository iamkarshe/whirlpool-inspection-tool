import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import { LoginStatCards } from "@/pages/dashboard/admin/logins/components/login-stat-cards";
import {
  getLogins,
  getLoginKpis,
  type LoginActivity,
  type LoginKpis,
} from "@/pages/dashboard/admin/logins/login-service";
import { useEffect, useState } from "react";

export default function LoginsPage() {
  const [kpis, setKpis] = useState<LoginKpis | null>(null);
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    setLoadingKpis(true);
    getLoginKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    setLoadingTable(true);
    getLogins()
      .then(setLogins)
      .finally(() => setLoadingTable(false));
  }, []);

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
          {loadingTable ? (
            <SkeletonTable />
          ) : (
            <LoginsDataTable data={logins} />
          )}
        </div>
      </div>
    </div>
  );
}
