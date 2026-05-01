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
  PlantCodeBadge,
  PlantDevicesCountBadge,
  PlantIdLinkBadge,
  PlantInspectionsCountBadge,
  PlantUsersCountBadge,
} from "@/pages/dashboard/admin/plants/plant-badge";
import type { Plant } from "@/pages/dashboard/admin/plants/plant-service";
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

const plantColumns: ColumnDef<Plant>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Plant ID
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <PlantIdLinkBadge id={row.original.id} />,
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
    cell: ({ row }) => <PlantCodeBadge code={row.original.plant_code} />,
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
      return <PlantUsersCountBadge plantId={p.id} count={p.users_count ?? 0} />;
    },
  },
  {
    id: "devices",
    header: "Devices",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <PlantDevicesCountBadge plantId={p.id} count={p.devices_count ?? 0} />
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
          plantId={p.id}
          count={p.inspections_count ?? 0}
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
  data: Plant[];
}

export default function PlantsDataTable({ data }: PlantsDataTableProps) {
  return (
    <DataTable<Plant>
      columns={plantColumns}
      data={data}
      searchKey="name"
      rangeLabel="plants"
    />
  );
}
