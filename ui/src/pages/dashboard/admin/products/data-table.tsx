import type { ProductListItemResponse } from "@/api/generated/model/productListItemResponse";
import type { DataTableServerSideConfig } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  BarChart3,
  LineChart,
  MoreHorizontal,
  Trash2,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { InspectionCountBadge } from "@/components/inspections/inspection-count-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import { Link } from "react-router-dom";

function buildProductColumns(): ColumnDef<ProductListItemResponse>[] {
  return [
  {
    accessorKey: "material_code",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Material code
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const p = row.original;
      return (
        <Link
          to={PAGES.productViewPath(p.uuid)}
          className="font-mono text-sm text-primary hover:underline"
        >
          {row.getValue("material_code")}
        </Link>
      );
    },
  },
  {
    accessorKey: "material_description",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Material description
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("material_description"),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created at
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("created_at"),
  },
  {
    accessorKey: "product_category_name",
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
      return <span>{row.getValue("product_category_name")}</span>;
    },
  },
  {
    id: "inspections_total",
    header: "Total inspections",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.material_code }}
        kind="total"
      />
    ),
  },
  {
    id: "inspections_inbound_passed",
    header: "Inbound passed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.material_code }}
        kind="inboundPassed"
      />
    ),
  },
  {
    id: "inspections_inbound_failed",
    header: "Inbound failed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.material_code }}
        kind="inboundFailed"
      />
    ),
  },
  {
    id: "inspections_outbound_passed",
    header: "Outbound passed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.material_code }}
        kind="outboundPassed"
      />
    ),
  },
  {
    id: "inspections_outbound_failed",
    header: "Outbound failed",
    cell: ({ row }) => (
      <InspectionCountBadge
        scope={{ productSerial: row.original.material_code }}
        kind="outboundFailed"
      />
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                to={PAGES.productViewPath(p.uuid)}
                className="flex items-center"
              >
                <Eye className="mr-2 h-4 w-4" />
                View product
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_OPERATIONS_ANALYTICS}?product=${encodeURIComponent(
                  p.material_code,
                )}`}
                className="flex items-center"
              >
                <LineChart className="mr-2 h-4 w-4" />
                Operations analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?product=${encodeURIComponent(
                  p.material_code,
                )}`}
                className="flex items-center"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Executive analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];
}

interface ProductsDataTableProps {
  data: ProductListItemResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function ProductsDataTable({
  data,
  serverSide,
  isLoading,
}: ProductsDataTableProps) {
  const productColumns = buildProductColumns();

  return (
    <DataTable<ProductListItemResponse>
      columns={productColumns}
      data={data}
      rangeLabel="products"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
