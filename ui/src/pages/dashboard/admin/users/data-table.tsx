import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  ArrowUpDown,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { UserResponse } from "@/api/generated/model/userResponse";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import { getAvatarImage } from "@/lib/utils";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/pages/dashboard/admin/users/user-badge";
import { isSuperadminRoleName } from "@/services/users-api";

function buildUserColumns(
  onEditUser: (user: UserResponse) => void,
): ColumnDef<UserResponse>[] {
  return [
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
      cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
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
      accessorKey: "mobile_number",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Mobile
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("mobile_number"),
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => row.getValue("designation"),
    },
    {
      accessorKey: "is_active",
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
      cell: ({ row }) => <UserStatusBadge isActive={row.original.is_active} />,
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("is_active") as boolean;
        if (filterValue === "true") return v === true;
        if (filterValue === "false") return v === false;
        return true;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        const userUuid = user.uuid;
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
                  to={PAGES.userViewPath(userUuid)}
                  className="flex items-center"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View user
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to={PAGES.userViewDevicesPath(userUuid)}
                  className="flex items-center"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  View devices
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to={PAGES.userViewInspectionsPath(userUuid)}
                  className="flex items-center"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View inspections
                </Link>
              </DropdownMenuItem>
              {!isSuperadminRoleName(user.role) ?
                <>
                  <DropdownMenuItem
                    className="flex items-center"
                    onSelect={(e) => {
                      e.preventDefault();
                      onEditUser(user);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Update user
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Delete
                  </DropdownMenuItem>
                </>
              : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

const userFilters: DataTableFilter<UserResponse>[] = [
  {
    id: "is_active",
    title: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    id: "role",
    title: "Role",
    options: [
      { value: "manager", label: "Manager" },
      { value: "operator", label: "Operator" },
    ],
  },
];

interface UsersDataTableProps {
  data: UserResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
  onEditUser: (user: UserResponse) => void;
}

export default function UsersDataTable({
  data,
  serverSide,
  isLoading,
  onEditUser,
}: UsersDataTableProps) {
  const columns = useMemo(
    () => buildUserColumns(onEditUser),
    [onEditUser],
  );

  return (
    <DataTable<UserResponse>
      columns={columns}
      data={data}
      filters={userFilters}
      rangeLabel="users"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
