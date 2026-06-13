import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, MoreHorizontal, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { TimeDisplay } from "@/components/time-display";
import LoginIpDetailDialog from "@/pages/dashboard/admin/logins/components/login-ip-detail-dialog";
import {
  LoginIpBadge,
  LoginNaBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import { formatLoginIpMetadata } from "@/pages/dashboard/admin/logins/login-format";
import type { LoginIpSummaryRow } from "@/pages/dashboard/admin/logins/login-types";

function buildIpSummaryColumns(
  onInvestigateIp: (ip: string) => void,
): ColumnDef<LoginIpSummaryRow>[] {
  return [
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
      cell: ({ row }) => <LoginIpBadge ip={row.original.ip_address} />,
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
          <span className="text-muted-foreground max-w-[220px] truncate text-xs">
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: "total_logins",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Logins
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "successful_logins",
      header: "Success",
    },
    {
      accessorKey: "failed_logins",
      header: "Failed",
    },
    {
      accessorKey: "unique_users",
      header: "Users",
    },
    {
      accessorKey: "last_seen_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last seen
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <TimeDisplay iso={row.original.last_seen_at} />,
    },
    {
      id: "risk",
      header: "Risk",
      cell: ({ row }) =>
        row.original.is_abusive ? (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Abusive
          </Badge>
        ) : (
          <Badge variant="secondary">Normal</Badge>
        ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const links = row.original.external_links;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onInvestigateIp(row.original.ip_address)}>
                IP investigation
              </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

const abusiveFilters: DataTableFilter<LoginIpSummaryRow>[] = [
  {
    id: "is_abusive",
    title: "Risk",
    options: [
      { value: "true", label: "Abusive only" },
      { value: "false", label: "All IPs" },
    ],
  },
];

type LoginIpSummaryDataTableProps = {
  data: LoginIpSummaryRow[];
  serverSide?: DataTableServerSideConfig;
  isLoading?: boolean;
};

export default function LoginIpSummaryDataTable({
  data,
  serverSide,
  isLoading,
}: LoginIpSummaryDataTableProps) {
  const [ipDetailOpen, setIpDetailOpen] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const columns = buildIpSummaryColumns((ip) => {
    setSelectedIp(ip);
    setIpDetailOpen(true);
  });

  return (
    <>
      <DataTable<LoginIpSummaryRow>
        columns={columns}
        data={data}
        filters={abusiveFilters}
        searchFields={["ip_address"]}
        rangeLabel="IPs"
        serverSide={serverSide}
        isLoading={isLoading ?? false}
      />
      <LoginIpDetailDialog
        open={ipDetailOpen}
        onOpenChange={setIpDetailOpen}
        ipAddress={selectedIp}
      />
    </>
  );
}
