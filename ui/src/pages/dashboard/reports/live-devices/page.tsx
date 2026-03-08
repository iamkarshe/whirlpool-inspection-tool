import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import {
  getLiveDevicesKpis,
  getLiveDevicesReport,
  type LiveDevicesKpis,
} from "@/pages/dashboard/reports/live-devices/live-devices-service";
import { LiveDevicesStatCards } from "@/pages/dashboard/reports/live-devices/components/live-devices-stat-cards";
import { useEffect, useState } from "react";

export default function LiveDevicesReportPage() {
  const [kpis, setKpis] = useState<LiveDevicesKpis | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    setLoadingKpis(true);
    getLiveDevicesKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    setLoadingTable(true);
    getLiveDevicesReport()
      .then(setDevices)
      .finally(() => setLoadingTable(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Live Devices"
          description="Devices currently or recently active for the selected period."
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
            <LiveDevicesStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {loadingTable ? (
            <SkeletonTable />
          ) : (
            <DevicesDataTable data={devices} />
          )}
        </div>
      </div>
    </div>
  );
}
