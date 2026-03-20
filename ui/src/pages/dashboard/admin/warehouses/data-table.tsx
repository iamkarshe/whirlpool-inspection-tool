import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import {
  WarehouseCodeBadge,
  WarehouseDevicesCountBadge,
  WarehouseIdLinkBadge,
  WarehouseInspectionsCountBadge,
  WarehouseUsersCountBadge,
} from "@/pages/dashboard/admin/warehouses/warehouse-badge";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Warehouse } from "./warehouse-service";

const warehouseColumns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Warehouse ID
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <WarehouseIdLinkBadge id={row.original.id} />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("name"),
  },
  {
    accessorKey: "warehouse_code",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Code
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <WarehouseCodeBadge code={row.original.warehouse_code} />
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate">
        {row.getValue("address")}
      </span>
    ),
  },
  {
    id: "coordinates",
    header: "Coordinates",
    cell: ({ row }) => {
      const { lat, lng } = row.original;
      if (lat == null || lng == null) return "—";
      return (
        <span className="font-mono text-xs">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      );
    },
  },
  {
    id: "users",
    header: "Users",
    cell: ({ row }) => {
      const w = row.original;
      return (
        <WarehouseUsersCountBadge
          warehouseId={w.id}
          count={w.users_count ?? 0}
        />
      );
    },
  },
  {
    id: "devices",
    header: "Devices",
    cell: ({ row }) => {
      const w = row.original;
      return (
        <WarehouseDevicesCountBadge
          warehouseId={w.id}
          count={w.devices_count ?? 0}
        />
      );
    },
  },
  {
    id: "inspections",
    header: "Inspections",
    cell: ({ row }) => {
      const w = row.original;
      return (
        <WarehouseInspectionsCountBadge
          warehouseId={w.id}
          count={w.inspections_count ?? 0}
        />
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const id = row.original.id;
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
              <Link to={PAGES.warehouseViewPath(id)}>View warehouse</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseUsersPath(id)}>View users</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseDevicesPath(id)}>View devices</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseInspectionsPath(id)}>
                View inspections
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

interface WarehousesDataTableProps {
  data: Warehouse[];
}

export default function WarehousesDataTable({
  data,
}: WarehousesDataTableProps) {
  return (
    <DataTable<Warehouse>
      columns={warehouseColumns}
      data={data}
      searchKey="name"
    />
  );
}
