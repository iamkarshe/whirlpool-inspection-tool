import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableFilter,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product } from "./product-service";

const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.getValue("name"),
  },
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        SKU
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("sku"),
  },
  {
    accessorKey: "category",
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
    cell: ({ row }) => row.getValue("category"),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Price
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("price") as number;
      return <span>${value.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.original.status;

      const statusMap: Record<Product["status"], "success" | "destructive"> = {
        active: "success",
        inactive: "destructive",
      };

      const statusClass = statusMap[status];

      return (
        <Badge variant={statusClass} className="capitalize">
          {status}
        </Badge>
      );
    },
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
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const productFilters: DataTableFilter<Product>[] = [
  {
    id: "status",
    title: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  {
    id: "category",
    title: "Category",
    options: [
      { value: "Washing Machines", label: "Washing Machines" },
      { value: "Washer-Dryer Combo", label: "Washer-Dryer Combo" },
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
      searchKey="name"
      filters={productFilters}
    />
  );
}

