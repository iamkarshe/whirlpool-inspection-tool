import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
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
  WarehouseInspectionsCountBadge,
  WarehouseUsersCountBadge,
} from "@/pages/dashboard/admin/warehouses/warehouse-badge";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  BarChart3,
  ClipboardList,
  Eye,
  LineChart,
  MoreHorizontal,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const warehouseColumns: ColumnDef<WarehouseResponse>[] = [
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
      <Link to={PAGES.warehouseViewPath(row.original.uuid)} className="inline-block">
        <WarehouseCodeBadge code={row.original.warehouse_code} />
      </Link>
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
    cell: ({ row }) => <WarehouseUsersCountBadge warehouseId={row.original.uuid} count={0} />,
  },
  {
    id: "devices",
    header: "Devices",
    cell: ({ row }) => <WarehouseDevicesCountBadge warehouseId={row.original.uuid} count={0} />,
  },
  {
    id: "inspections",
    header: "Inspections",
    cell: ({ row }) => (
      <WarehouseInspectionsCountBadge warehouseId={row.original.uuid} count={0} />
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const id = row.original.uuid;
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
              <Link to={PAGES.warehouseViewPath(id)} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                View warehouse
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseUsersPath(id)} className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                View users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseDevicesPath(id)} className="flex items-center">
                <Smartphone className="mr-2 h-4 w-4" />
                View devices
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseInspectionsPath(id)} className="flex items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                View inspections
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_OPERATIONS_ANALYTICS}?warehouse_id=${id}`}
                className="flex items-center"
              >
                <LineChart className="mr-2 h-4 w-4" />
                Operations analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?warehouse_id=${id}`}
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

interface WarehousesDataTableProps {
  data: WarehouseResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function WarehousesDataTable({
  data,
  serverSide,
  isLoading,
}: WarehousesDataTableProps) {
  return (
    <DataTable<WarehouseResponse>
      columns={warehouseColumns}
      data={data}
      rangeLabel="warehouses"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
