import type { ColumnDef } from "@tanstack/react-table";

import type { DefectsWarehouseItem } from "@/api/generated/model/defectsWarehouseItem";
import { DataTable } from "@/components/ui/data-table";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

const columns: ColumnDef<DefectsWarehouseItem>[] = [
  {
    id: "warehouse",
    header: "Warehouse",
    accessorFn: (row) =>
      `${row.warehouse_code} ${row.warehouse_name}`.toLowerCase(),
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <span className="font-medium">{row.original.warehouse_code}</span>
        <span className="text-muted-foreground"> — {row.original.warehouse_name}</span>
      </div>
    ),
  },
  {
    accessorKey: "total_inspections",
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.total_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_inspections",
    header: () => <span className="block text-right">Defective</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.defective_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_pct",
    header: () => <span className="block text-right">Defect %</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatPct(row.original.defective_pct)}
      </span>
    ),
  },
  {
    id: "dgr",
    header: () => <span className="block text-right">DGR</span>,
    accessorFn: (row) => row.grading_defects.dgr ?? 0,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.dgr ?? 0)}
      </span>
    ),
  },
  {
    id: "ldgr",
    header: () => <span className="block text-right">LDGR</span>,
    accessorFn: (row) => row.grading_defects.ldgr ?? 0,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.ldgr ?? 0)}
      </span>
    ),
  },
  {
    id: "scrap",
    header: () => <span className="block text-right">SCRAP</span>,
    accessorFn: (row) => row.grading_defects.scrap ?? 0,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.scrap ?? 0)}
      </span>
    ),
  },
];

export function ExecutiveWarehouseDefectsTable({
  data,
  isLoading,
}: {
  data: DefectsWarehouseItem[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="warehouse_name"
      showDateRangePicker={false}
      rangeLabel="warehouses"
      isLoading={isLoading}
      downloadCsvFileName="executive-warehouse-defects.csv"
      downloadCsv={(rows) => ({
        headers: [
          "Warehouse code",
          "Warehouse name",
          "Total inspections",
          "Defective inspections",
          "Defect %",
          "DGR",
          "LDGR",
          "SCRAP",
        ],
        rows: rows.map((row) => ({
          "Warehouse code": row.warehouse_code,
          "Warehouse name": row.warehouse_name,
          "Total inspections": row.total_inspections,
          "Defective inspections": row.defective_inspections,
          "Defect %": row.defective_pct,
          DGR: row.grading_defects.dgr ?? 0,
          LDGR: row.grading_defects.ldgr ?? 0,
          SCRAP: row.grading_defects.scrap ?? 0,
        })),
      })}
    />
  );
}
