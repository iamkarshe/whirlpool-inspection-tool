import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, Info, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { TimeDisplay } from "@/components/time-display";
import LoginDetailDialog from "@/pages/dashboard/admin/logins/components/login-detail-dialog";
import LoginIpDetailDialog from "@/pages/dashboard/admin/logins/components/login-ip-detail-dialog";
import {
  LoginIpBadge,
  LoginNaBadge,
  LoginStatusBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import { formatLoginIpMetadata } from "@/pages/dashboard/admin/logins/login-format";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-types";

function buildLoginColumns(
  onMoreInfo: (log: LoginActivity) => void,
  onIpDetail: (ip: string) => void,
): ColumnDef<LoginActivity>[] {
  return [
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const log = row.original;
        const label = log.user_name?.trim();
        if (!label || label === "—") {
          return (
            <LoginNaBadge tooltip="User information was not available for this login." />
          );
        }
        return <span className="font-medium">{label}</span>;
      },
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
      cell: ({ row }) => {
        const email = ((row.getValue("email") as string) ?? "").trim();
        if (!email) {
          return (
            <LoginNaBadge tooltip="Email was not recorded for this login." />
          );
        }
        return (
          <span className="text-muted-foreground text-sm">{email}</span>
        );
      },
    },
    {
      accessorKey: "logged_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Logged at
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <TimeDisplay iso={row.original.logged_at} />
      ),
    },
    {
      accessorKey: "ip_address",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          IP address
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.ip_address?.trim() ? (
          <LoginIpBadge ip={row.original.ip_address} />
        ) : (
          <LoginNaBadge tooltip="No IP address captured for this login." />
        ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const label = formatLoginIpMetadata(row.original.ip_metadata);
        if (!label) {
          return (
            <LoginNaBadge tooltip="Geolocation has not been resolved for this IP yet." />
          );
        }
        return (
          <span className="text-muted-foreground max-w-[200px] truncate text-xs">
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: "login_method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.original.login_method?.trim();
        if (!method) return <span className="text-muted-foreground">—</span>;
        return <span className="text-xs">{method}</span>;
      },
    },
    {
      accessorKey: "device_info",
      header: "Device / Source",
      cell: ({ row }) => {
        const deviceInfo = row.original.device_info?.trim();
        const isUnknown =
          !deviceInfo || deviceInfo.toLowerCase() === "unknown";
        if (isUnknown) {
          return (
            <LoginNaBadge tooltip="Device or browser information was not available for this login." />
          );
        }
        return (
          <span className="text-muted-foreground max-w-[180px] truncate text-xs">
            {deviceInfo}
          </span>
        );
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
      cell: ({ row }) => (
        <LoginStatusBadge success={row.original.success} />
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: "",
      cell: ({ row }) => {
        const log = row.original;
        const links = log.external_links;
        const ip = log.ip_address?.trim();
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onMoreInfo(log)}>
                <Info className="mr-2 h-4 w-4" />
                More information
              </DropdownMenuItem>
              {ip ? (
                <DropdownMenuItem onSelect={() => onIpDetail(ip)}>
                  IP investigation
                </DropdownMenuItem>
              ) : null}
              {links?.ipinfo ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href={links.ipinfo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      IPinfo
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={links.abuseipdb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      AbuseIPDB
                    </a>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

const loginFilters: DataTableFilter<LoginActivity>[] = [
  {
    id: "status",
    title: "Status",
    options: [
      { value: "successful", label: "Success" },
      { value: "failed", label: "Failed" },
    ],
  },
];

interface LoginsDataTableProps {
  data: LoginActivity[];
  serverSide?: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function LoginsDataTable({
  data,
  serverSide,
  isLoading,
}: LoginsDataTableProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [ipDetailOpen, setIpDetailOpen] = useState(false);
  const [selectedLogin, setSelectedLogin] = useState<LoginActivity | null>(
    null,
  );
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const columns = buildLoginColumns(
    (log) => {
      setSelectedLogin(log);
      setDetailOpen(true);
    },
    (ip) => {
      setSelectedIp(ip);
      setIpDetailOpen(true);
    },
  );

  return (
    <>
      <DataTable<LoginActivity>
        columns={columns}
        data={data}
        filters={loginFilters}
        searchFields={["user_name", "email", "ip_address"]}
        rangeLabel="logins"
        isLoading={isLoading ?? false}
        serverSide={serverSide}
      />
      <LoginDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        login={selectedLogin}
      />
      <LoginIpDetailDialog
        open={ipDetailOpen}
        onOpenChange={setIpDetailOpen}
        ipAddress={selectedIp}
      />
    </>
  );
}
