import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { DefectsWarehouseItem } from "@/api/generated/model/defectsWarehouseItem";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

/** Warehouses at or above this defect % are highlighted in the table. */
const HIGH_DEFECT_RATE_PCT = 1;

const ALIGN_RIGHT = { align: "right" as const };

function warehouseRowClassName(row: DefectsWarehouseItem) {
  const highlight =
    row.defective_pct >= HIGH_DEFECT_RATE_PCT ||
    row.warehouse_induced_defect_pct >= HIGH_DEFECT_RATE_PCT;
  if (!highlight) return undefined;
  return "bg-red-50/70 hover:bg-red-50/90 dark:bg-red-950/40 dark:hover:bg-red-950/55";
}

function SortableHeader({
  column,
  label,
  align = "left",
  tooltip,
}: {
  column: Column<DefectsWarehouseItem, unknown>;
  label: string;
  align?: "left" | "right";
  tooltip?: string;
}) {
  const sorted = column.getIsSorted();

  const headerButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2 font-medium",
        align === "right"
          ? "-mr-3 flex w-full justify-end"
          : "-ml-3 justify-start",
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span className={cn(align === "right" && "w-full text-right")}>
        {label}
      </span>
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <ArrowUpDown
          className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50"
          aria-hidden
        />
      )}
    </Button>
  );

  if (!tooltip) return headerButton;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{headerButton}</TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

const columns: ColumnDef<DefectsWarehouseItem>[] = [
  {
    id: "warehouse",
    accessorFn: (row) => `${row.warehouse_code} ${row.warehouse_name}`,
    header: ({ column }) => (
      <SortableHeader column={column} label="Warehouse" align="left" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <span className="font-medium">{row.original.warehouse_code}</span>
        <span className="text-muted-foreground">
          {" "}
          — {row.original.warehouse_name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "total_inspections",
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="Total" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.total_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_inspections",
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="Defective" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.defective_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_pct",
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="Defect %" align="right" />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          "block text-right tabular-nums",
          row.original.defective_pct >= HIGH_DEFECT_RATE_PCT &&
            "font-semibold text-red-700 dark:text-red-400",
        )}
      >
        {formatPct(row.original.defective_pct)}
      </span>
    ),
  },
  {
    id: "dgr",
    accessorFn: (row) => row.grading_defects.dgr ?? 0,
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="DGR" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.dgr ?? 0)}
      </span>
    ),
  },
  {
    id: "ldgr",
    accessorFn: (row) => row.grading_defects.ldgr ?? 0,
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="LDGR" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.ldgr ?? 0)}
      </span>
    ),
  },
  {
    id: "scrap",
    accessorFn: (row) => row.grading_defects.scrap ?? 0,
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="SCRAP" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.scrap ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: "warehouse_induced_defect_pct",
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="WID %"
        align="right"
        tooltip="Warehouse Induced Defect"
      />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          "block text-right tabular-nums",
          row.original.warehouse_induced_defect_pct >= HIGH_DEFECT_RATE_PCT &&
            "font-semibold text-red-700 dark:text-red-400",
        )}
      >
        {formatPct(row.original.warehouse_induced_defect_pct)}
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
    <TooltipProvider>
      <DataTable
        columns={columns}
        data={data}
        searchKey="warehouse"
        showDateRangePicker={false}
        showAllRows
        rangeLabel="warehouses"
        isLoading={isLoading}
        getRowClassName={warehouseRowClassName}
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
            "WID %",
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
            "WID %": row.warehouse_induced_defect_pct,
          })),
        })}
      />
    </TooltipProvider>
  );
}
