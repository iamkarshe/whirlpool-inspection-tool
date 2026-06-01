import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  ArrowUpDown,
  BookOpen,
  ClipboardList,
  Download,
  Eye,
  MoreHorizontal,
  Network,
  Pencil,
  QrCode,
  Settings2,
  ShieldOff,
  Smartphone,
  UserCheck,
  UserX,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PAGES } from "@/endpoints";
import { getAvatarImage } from "@/lib/utils";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/pages/dashboard/admin/users/user-badge";
import {
  isSuperadminRoleName,
  isUserVpnProvisioned,
} from "@/services/users-api";

function buildUserColumns(
  onEditUser: (user: UserResponse) => void,
  onToggleUserActive: (user: UserResponse) => void,
  togglingUserUuid: string | null,
  onVpnSetup: (user: UserResponse) => void,
  onVpnDownloadConfig: (user: UserResponse) => void,
  onVpnDownloadQr: (user: UserResponse) => void,
  onVpnRevoke: (user: UserResponse) => void,
  onVpnShowInstructions: (user: UserResponse) => void,
  vpnBusyUserUuid: string | null,
  vpnBusyAction: "setup" | "config" | "qr" | "revoke" | "email" | null,
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
        const vpnProvisioned = isUserVpnProvisioned(user);
        const vpnBusy = vpnBusyUserUuid === userUuid;
        return (
          <div className="flex items-center justify-end gap-1">
            {!isSuperadminRoleName(user.role) ? (
              <TooltipProvider delayDuration={300}>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            !user.is_active ||
                            (vpnBusy &&
                              (vpnBusyAction === "setup" ||
                                vpnBusyAction === "revoke"))
                          }
                          aria-label="VPN Provision"
                        >
                          <Network className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>VPN Provision</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    {!vpnProvisioned ? (
                      <DropdownMenuItem
                        disabled={
                          !user.is_active ||
                          (vpnBusy && vpnBusyAction !== "setup")
                        }
                        onSelect={(e) => {
                          e.preventDefault();
                          onVpnSetup(user);
                        }}
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        {vpnBusy && vpnBusyAction === "setup"
                          ? "Setting up…"
                          : "Setup"}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      disabled={
                        !vpnProvisioned ||
                        (vpnBusy && vpnBusyAction !== "config")
                      }
                      onSelect={(e) => {
                        e.preventDefault();
                        onVpnDownloadConfig(user);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {vpnBusy && vpnBusyAction === "config"
                        ? "Downloading…"
                        : "Download config"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        !vpnProvisioned || (vpnBusy && vpnBusyAction !== "qr")
                      }
                      onSelect={(e) => {
                        e.preventDefault();
                        onVpnDownloadQr(user);
                      }}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      {vpnBusy && vpnBusyAction === "qr"
                        ? "Downloading…"
                        : "Download QR"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!vpnProvisioned}
                      onSelect={(e) => {
                        e.preventDefault();
                        onVpnShowInstructions(user);
                      }}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Instructions
                    </DropdownMenuItem>
                    {vpnProvisioned ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={vpnBusy && vpnBusyAction !== "revoke"}
                          onSelect={(e) => {
                            e.preventDefault();
                            onVpnRevoke(user);
                          }}
                        >
                          <ShieldOff className="mr-2 h-4 w-4" />
                          {vpnBusy && vpnBusyAction === "revoke"
                            ? "Revoking…"
                            : "Revoke"}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipProvider>
            ) : null}
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
                {!isSuperadminRoleName(user.role) ? (
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
                    <DropdownMenuItem
                      className={
                        user.is_active
                          ? "text-destructive focus:text-destructive"
                          : undefined
                      }
                      disabled={togglingUserUuid === userUuid}
                      onSelect={(e) => {
                        e.preventDefault();
                        onToggleUserActive(user);
                      }}
                    >
                      {user.is_active ? (
                        <>
                          <UserX className="mr-2 h-4 w-4 text-destructive" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
  onToggleUserActive: (user: UserResponse) => void;
  togglingUserUuid?: string | null;
  onVpnSetup: (user: UserResponse) => void;
  onVpnDownloadConfig: (user: UserResponse) => void;
  onVpnDownloadQr: (user: UserResponse) => void;
  onVpnRevoke: (user: UserResponse) => void;
  onVpnShowInstructions: (user: UserResponse) => void;
  vpnBusyUserUuid?: string | null;
  vpnBusyAction?: "setup" | "config" | "qr" | "revoke" | "email" | null;
}

export default function UsersDataTable({
  data,
  serverSide,
  isLoading,
  onEditUser,
  onToggleUserActive,
  togglingUserUuid = null,
  onVpnSetup,
  onVpnDownloadConfig,
  onVpnDownloadQr,
  onVpnRevoke,
  onVpnShowInstructions,
  vpnBusyUserUuid = null,
  vpnBusyAction = null,
}: UsersDataTableProps) {
  const columns = useMemo(
    () =>
      buildUserColumns(
        onEditUser,
        onToggleUserActive,
        togglingUserUuid,
        onVpnSetup,
        onVpnDownloadConfig,
        onVpnDownloadQr,
        onVpnRevoke,
        onVpnShowInstructions,
        vpnBusyUserUuid,
        vpnBusyAction,
      ),
    [
      onEditUser,
      onToggleUserActive,
      togglingUserUuid,
      onVpnSetup,
      onVpnDownloadConfig,
      onVpnDownloadQr,
      onVpnRevoke,
      onVpnShowInstructions,
      vpnBusyUserUuid,
      vpnBusyAction,
    ],
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
