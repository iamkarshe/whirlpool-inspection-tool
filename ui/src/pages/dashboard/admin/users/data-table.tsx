import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvatarImage } from "@/lib/utils";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={getAvatarImage()} alt={row.original.name} />
        </Avatar>
        <div className="capitalize">{row.getValue("name")}</div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Role
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("role"),
  },
  {
    accessorKey: "plan_name",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Plan
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("plan_name"),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("email"),
  },
  {
    accessorKey: "country",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Country
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("country"),
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

      const statusMap: Record<
        User["status"],
        "success" | "destructive" | "warning"
      > = {
        active: "success",
        inactive: "destructive",
        pending: "warning",
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
          <DropdownMenuItem>View user</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const userFilters: DataTableFilter<User>[] = [
  {
    id: "status",
    title: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending", label: "Pending" },
    ],
  },
  {
    id: "plan_name",
    title: "Plan",
    options: [
      { value: "Basic", label: "Basic" },
      { value: "Team", label: "Team" },
      { value: "Enterprise", label: "Enterprise" },
    ],
  },
  {
    id: "role",
    title: "Role",
    options: [
      { value: "Construction Foreman", label: "Construction Foreman" },
      { value: "Project Manager", label: "Project Manager" },
      { value: "Construction Expeditor", label: "Construction Expeditor" },
    ],
  },
];

interface UsersDataTableProps {
  data: User[];
}

export default function UsersDataTable({ data }: UsersDataTableProps) {
  return (
    <DataTable<User>
      columns={userColumns}
      data={data}
      searchKey="name"
      filters={userFilters}
    />
  );
}
