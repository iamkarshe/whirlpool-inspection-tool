import type { InspectionListItemResponse } from "@/api/generated/model/inspectionListItemResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS,
  sortingStateToApiSortQuery,
} from "@/components/ui/data-table-server";
import { PAGES } from "@/endpoints";
import { useServerTableData } from "@/hooks/use-server-table-data";
import { formatDate } from "@/lib/core";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { fetchWarehouseInspectionsPage } from "@/services/warehouses-api";
import type { WarehouseViewContext } from "./context";

const WAREHOUSE_INSPECTIONS_SORT = {
  allowedColumns: ["id", "inspection_type", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

const columns: ColumnDef<InspectionListItemResponse>[] = [
  {
    accessorKey: "uuid",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Inspection
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to={PAGES.inspectionViewPath(row.original.uuid)} className="text-primary hover:underline font-mono text-xs">
        {row.original.uuid}
      </Link>
    ),
  },
  { accessorKey: "inspector_name", header: "Inspector" },
  { accessorKey: "inspection_type", header: "Type" },
  {
    accessorKey: "product_id",
    header: "Product",
    cell: ({ row }) => <span className="font-mono text-xs">#{row.original.product_id}</span>,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

export default function WarehouseViewInspectionsPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const committedSearchRef = useRef<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const committed = searchDraft.trim();
      const previousCommitted = committedSearchRef.current;
      if (previousCommitted !== null && previousCommitted !== committed) {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      }
      committedSearchRef.current = committed;
      setSearchQuery(committed);
    }, DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const { rows, total, isLoading } = useServerTableData<InspectionListItemResponse>({
    pagination,
    searchQuery,
    sorting,
    errorMessage: "Failed to load warehouse inspections.",
    load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        s,
        WAREHOUSE_INSPECTIONS_SORT,
      );
      const res = await fetchWarehouseInspectionsPage(
        {
          warehouse_uuid: warehouse.uuid,
          page: p.pageIndex + 1,
          per_page: p.pageSize,
          search: q.length > 0 ? q : null,
          sort_by,
          sort_dir,
        },
        { signal },
      );
      return { data: res.data, total: res.total };
    },
  });

  const serverSide = useMemo(
    () => ({
      totalRowCount: total,
      pagination,
      onPaginationChange: setPagination,
      sorting,
      onSortingChange: handleSortingChange,
      search: searchDraft,
      onSearchChange: setSearchDraft,
    }),
    [total, pagination, sorting, handleSortingChange, searchDraft],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      rangeLabel="inspections"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
