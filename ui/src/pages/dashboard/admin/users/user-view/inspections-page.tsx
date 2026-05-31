import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { INSPECTION_LIST_SORT } from "@/pages/dashboard/inspections/components/inspection-list-query";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { fetchInspectionsPage } from "@/services/inspections-api";
import { useOutletContext } from "react-router-dom";
import type { UserViewContext } from "./context";

export default function UserViewInspectionsPage() {
  const { user } = useOutletContext<UserViewContext>();
  const inspectorLabel = user.name?.trim() ?? "";

  const { rows, isLoading, serverSide } = useControlledServerTable<Inspection>({
    initialSorting: [{ id: "created_at", desc: true }],
    dataScopeKey: user.id,
    errorMessage: "Failed to load user inspections.",
    load: async ({ signal, pagination, searchQuery, sorting }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        sorting,
        INSPECTION_LIST_SORT,
      );
      const q = searchQuery.trim() || inspectorLabel;
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
        data: res.data.filter((row) => row.inspector_id === user.id),
        total: res.total,
      };
    },
  });

  return (
    <InspectionsDataTable
      data={rows}
      serverSide={serverSide}
      isLoading={isLoading}
      hideDeviceColumn={false}
    />
  );
}
