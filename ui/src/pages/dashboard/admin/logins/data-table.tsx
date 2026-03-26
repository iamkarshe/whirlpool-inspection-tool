import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import {
  LoginIdBadge,
  LoginIpBadge,
  LoginNaBadge,
  LoginStatusBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import { formatDate } from "@/lib/core";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

function buildLoginColumns(
  onMoreInfo: (log: LoginActivity) => void,
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
        if (log.user_id > 0) {
          return (
            <Link
              to={PAGES.userViewPath(log.user_id)}
              className="text-primary hover:underline"
            >
              {log.user_name}
            </Link>
          );
        }
        return (
          <LoginNaBadge tooltip="User information was not available for this login." />
        );
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
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue("email")}
        </span>
      ),
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
        <span className="font-mono text-xs">
          {formatDate(row.original.logged_at)}
        </span>
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
      cell: ({ row }) => (
        <LoginIpBadge ip={row.original.ip_address} />
      ),
    },
    {
      accessorKey: "device_info",
      header: "Device / Source",
      cell: ({ row }) => {
        const deviceInfo = row.original.device_info?.trim();
        const isUnknown =
          deviceInfo === "" ||
          deviceInfo === undefined ||
          deviceInfo === "Unknown";
        if (isUnknown) {
          return (
            <LoginNaBadge tooltip="Device or browser information was not available for this login." />
          );
        }
        return (
          <span className="text-muted-foreground max-w-[200px] truncate text-xs">
            {deviceInfo}
          </span>
        );
      },
    },
    {
      accessorKey: "success",
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
      cell: ({ row }) => <LoginStatusBadge success={row.original.success} />,
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("success") as boolean;
        if (filterValue === "true") return v === true;
        if (filterValue === "false") return v === false;
        return true;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMoreInfo(row.original)}
          aria-label="More info"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];
}

const loginFilters: DataTableFilter<LoginActivity>[] = [
  {
    id: "success",
    title: "Status",
    options: [
      { value: "true", label: "Success" },
      { value: "false", label: "Failed" },
    ],
  },
];

interface LoginsDataTableProps {
  data: LoginActivity[];
}

export default function LoginsDataTable({ data }: LoginsDataTableProps) {
  const [selectedLogin, setSelectedLogin] = useState<LoginActivity | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const handleMoreInfo = (log: LoginActivity) => {
    setSelectedLogin(log);
    setModalOpen(true);
  };

  const columns = buildLoginColumns(handleMoreInfo);

  return (
    <>
      <DataTable<LoginActivity>
        columns={columns}
        data={data}
        searchKey="user_name"
        filters={loginFilters}
        dateRangeFilter={{ dateAccessorKey: "logged_at" }}
        rangeLabel="logins"
      />
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Login Details</DialogTitle>
          </DialogHeader>
          {selectedLogin && (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">ID</span>
                <LoginIdBadge id={selectedLogin.id} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">User</span>
                <span>
                  {selectedLogin.user_id > 0 ? (
                    <Link
                      to={PAGES.userViewPath(selectedLogin.user_id)}
                      className="text-primary hover:underline"
                    >
                      {selectedLogin.user_name}
                    </Link>
                  ) : (
                    selectedLogin.user_name
                  )}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="break-all">{selectedLogin.email}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Logged at</span>
                <span className="font-mono text-xs">
                  {formatDate(selectedLogin.logged_at)}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">IP address</span>
                <LoginIpBadge ip={selectedLogin.ip_address} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Device / Source</span>
                <span className="break-words">
                  {selectedLogin.device_info ?? "—"}
                </span>
              </div>
              {selectedLogin.user_agent ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">User agent</span>
                  <span className="break-all">
                    {selectedLogin.user_agent}
                  </span>
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Status</span>
                <LoginStatusBadge success={selectedLogin.success} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
