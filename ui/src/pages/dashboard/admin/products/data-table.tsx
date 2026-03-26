import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { InspectionCountBadge } from "@/components/inspections/inspection-count-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import type { Product } from "@/pages/dashboard/admin/products/product-service";
import { Link } from "react-router-dom";

const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "serial_number",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Serial number
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("serial_number")}</span>
    ),
  },
  {
    accessorKey: "manufacturing_date",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Manufacturing date
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("manufacturing_date"),
  },
  {
    accessorKey: "batch_number",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Batch number
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("batch_number"),
  },
  {
    accessorKey: "category_name",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const p = row.original;
      return (
        <Link
          to={`${PAGES.DASHBOARD_MASTERS_PRODUCT_CATEGORIES}?product_category_id=${p.product_category_id}`}
          className="text-primary hover:underline"
        >
          {row.getValue("category_name")}
        </Link>
      );
    },
  },
  {
    id: "inspections_total",
    header: "Total inspections",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.serial_number }}
        kind="total"
      />
    ),
  },
  {
    id: "inspections_inbound_passed",
    header: "Inbound passed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.serial_number }}
        kind="inboundPassed"
      />
    ),
  },
  {
    id: "inspections_inbound_failed",
    header: "Inbound failed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.serial_number }}
        kind="inboundFailed"
      />
    ),
  },
  {
    id: "inspections_outbound_passed",
    header: "Outbound passed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.serial_number }}
        kind="outboundPassed"
      />
    ),
  },
  {
    id: "inspections_outbound_failed",
    header: "Outbound failed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.serial_number }}
        kind="outboundFailed"
      />
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View product</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const productFilters: DataTableFilter<Product>[] = [
  {
    id: "category_name",
    title: "Category",
    options: [
      {
        value: "Front Load Washing Machines",
        label: "Front Load Washing Machines",
      },
      {
        value: "Top Load Washing Machines",
        label: "Top Load Washing Machines",
      },
      {
        value: "Double Door Refrigerators",
        label: "Double Door Refrigerators",
      },
      {
        value: "Single Door Refrigerators",
        label: "Single Door Refrigerators",
      },
    ],
  },
];

interface ProductsDataTableProps {
  data: Product[];
}

export default function ProductsDataTable({ data }: ProductsDataTableProps) {
  return (
    <DataTable<Product>
      columns={productColumns}
      data={data}
      searchKey="serial_number"
      filters={productFilters}
      rangeLabel="products"
    />
  );
}
