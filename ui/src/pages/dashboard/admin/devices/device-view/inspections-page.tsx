import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { INSPECTION_LIST_SORT } from "@/pages/dashboard/inspections/components/inspection-list-query";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { fetchInspectionsPage } from "@/services/inspections-api";
import { useOutletContext } from "react-router-dom";

type DeviceViewContext = { device: Device };

export default function DeviceViewInspectionsPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const fingerprint = device.device_fingerprint.trim();

  const { rows, isLoading, serverSide } = useControlledServerTable<Inspection>({
    initialSorting: [{ id: "created_at", desc: true }],
    dataScopeKey: fingerprint,
    errorMessage: "Failed to load device inspections.",
    load: async ({ signal, pagination, searchQuery, sorting }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        sorting,
        INSPECTION_LIST_SORT,
      );
      const q = searchQuery.trim() || fingerprint;
      const res = await fetchInspectionsPage(
        {
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
          search: q.length > 0 ? q : null,
          sort_by,
          sort_dir,
        },
        { signal },
      );
      return {
        data: res.data.filter((row) => row.device_fingerprint === fingerprint),
        total: res.total,
      };
    },
  });

  return (
    <InspectionsDataTable
      data={rows}
      serverSide={serverSide}
      isLoading={isLoading}
      hideDeviceColumn
    />
  );
}
