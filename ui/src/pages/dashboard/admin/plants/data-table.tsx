import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlantResponse } from "@/api/generated/model/plantResponse";
import { PAGES } from "@/endpoints";
import {
  PlantCodeBadge,
  PlantDevicesCountBadge,
  PlantInspectionsCountBadge,
  PlantUsersCountBadge,
} from "@/pages/dashboard/admin/plants/plant-badge";
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

const plantColumns: ColumnDef<PlantResponse>[] = [
  {
    accessorKey: "plant_code",
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
      <Link to={PAGES.plantViewPath(row.original.uuid)} className="inline-block">
        <PlantCodeBadge code={row.original.plant_code} />
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
    cell: ({ row }) => {
      const p = row.original;
      return <PlantUsersCountBadge plantId={p.uuid} count={0} />;
    },
  },
  {
    id: "devices",
    header: "Devices",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <PlantDevicesCountBadge plantId={p.uuid} count={0} />
      );
    },
  },
  {
    id: "inspections",
    header: "Inspections",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <PlantInspectionsCountBadge
          plantId={p.uuid}
          count={0}
        />
      );
    },
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
              <Link to={PAGES.plantViewPath(id)} className="flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                View plant
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.plantUsersPath(id)} className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                View users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.plantDevicesPath(id)} className="flex items-center">
                <Smartphone className="mr-2 h-4 w-4" />
                View devices
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={PAGES.plantInspectionsPath(id)}
                className="flex items-center"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                View inspections
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_OPERATIONS_ANALYTICS}?plant_id=${id}`}
                className="flex items-center"
              >
                <LineChart className="mr-2 h-4 w-4" />
                Operations analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?plant_id=${id}`}
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

interface PlantsDataTableProps {
  data: PlantResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function PlantsDataTable({
  data,
  serverSide,
  isLoading,
}: PlantsDataTableProps) {
  return (
    <DataTable<PlantResponse>
      columns={plantColumns}
      data={data}
      rangeLabel="plants"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
