import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { PlantResponse } from "@/api/generated/model/plantResponse";
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
import { PAGES } from "@/endpoints";
import {
  PlantCodeBadge,
  PlantDevicesCountBadge,
  PlantInspectionsCountBadge,
  PlantStatusBadge,
  PlantUsersCountBadge,
} from "@/pages/dashboard/admin/plants/plant-badge";

function buildPlantColumns(
  onEditPlant: (plant: PlantResponse) => void,
  onDeletePlant: (plant: PlantResponse) => void,
): ColumnDef<PlantResponse>[] {
  return [
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
        <Link
          to={PAGES.plantViewPath(row.original.uuid)}
          className="inline-block"
        >
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
        return <PlantDevicesCountBadge plantId={p.uuid} count={0} />;
      },
    },
    {
      id: "inspections",
      header: "Inspections",
      cell: ({ row }) => {
        const p = row.original;
        return <PlantInspectionsCountBadge plantId={p.uuid} count={0} />;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <PlantStatusBadge isActive={row.original.is_active} />
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const plant = row.original;
        const id = plant.uuid;
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
              <DropdownMenuItem
                className="flex items-center"
                onSelect={() => onEditPlant(plant)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit plant
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to={PAGES.plantUsersPath(id)}
                  className="flex items-center"
                >
                  <Users className="mr-2 h-4 w-4" />
                  View users
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to={PAGES.plantDevicesPath(id)}
                  className="flex items-center"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  View devices
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDeletePlant(plant)}
              >
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

interface PlantsDataTableProps {
  data: PlantResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
  onEditPlant: (plant: PlantResponse) => void;
  onDeletePlant: (plant: PlantResponse) => void;
}

export default function PlantsDataTable({
  data,
  serverSide,
  isLoading,
  onEditPlant,
  onDeletePlant,
}: PlantsDataTableProps) {
  const columns = useMemo(
    () => buildPlantColumns(onEditPlant, onDeletePlant),
    [onEditPlant, onDeletePlant],
  );

  return (
    <DataTable<PlantResponse>
      columns={columns}
      data={data}
      rangeLabel="plants"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
