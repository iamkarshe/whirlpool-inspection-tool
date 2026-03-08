import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import {
  getDailyLoginKpis,
  getDailyLoginReport,
  type DailyLoginKpis,
} from "@/pages/dashboard/reports/daily-logins/daily-login-service";
import { DailyLoginStatCards } from "@/pages/dashboard/reports/daily-logins/components/daily-login-stat-cards";
import { useEffect, useState } from "react";

export default function DailyLoginsReportPage() {
  const [kpis, setKpis] = useState<DailyLoginKpis | null>(null);
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    setLoadingKpis(true);
    getDailyLoginKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    setLoadingTable(true);
    getDailyLoginReport()
      .then(setLogins)
      .finally(() => setLoadingTable(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Daily Logins"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-lg border bg-muted/50"
                />
              ))}
            </div>
          ) : kpis ? (
            <DailyLoginStatCards kpis={kpis} />
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
