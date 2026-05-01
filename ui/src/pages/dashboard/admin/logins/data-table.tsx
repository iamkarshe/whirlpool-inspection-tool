import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTable,
  type DataTableFilter,
  type DataTableServerSideConfig,
} from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import {
  LoginIdBadge,
  LoginIpBadge,
  LoginNaBadge,
  LoginStatusBadge,
} from "@/pages/dashboard/admin/logins/login-badge";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-types";
import {
  fetchLoginDetail,
  loginApiErrorMessage,
  stringifyLoginDeviceInfo,
} from "@/services/logins-api";
import type { ColumnDef } from "@tanstack/react-table";
import type { LoginDetailResponse } from "@/api/generated/model/loginDetailResponse";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
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
      cell: ({ row }) =>
        row.original.ip_address?.trim() ? (
          <LoginIpBadge ip={row.original.ip_address} />
        ) : (
          <LoginNaBadge tooltip="No IP address captured for this login." />
        ),
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
          <span className="text-muted-foreground max-w-[200px] truncate text-xs">
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
      filterFn: (row, _columnId, filterValue) => {
        const v = (row.original.status ?? "").toLowerCase();
        if (filterValue === "successful") return v === "successful";
        if (filterValue === "failed") return v === "failed";
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

function mergeDetailBasics(log: LoginActivity, d: LoginDetailResponse): LoginActivity {
  return {
    ...log,
    ip_address: d.ip_address ?? log.ip_address,
    device_info: d.device_source || log.device_info,
    user_agent: d.user_agent,
    status: d.status,
    success: d.status.toLowerCase() === "successful",
    email: d.email ?? log.email,
  };
}

export default function LoginsDataTable({
  data,
  serverSide,
  isLoading,
}: LoginsDataTableProps) {
  const [selectedLogin, setSelectedLogin] = useState<LoginActivity | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<LoginDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleMoreInfo = (log: LoginActivity) => {
    setSelectedLogin(log);
    setDetail(null);
    setDetailError(null);
    setModalOpen(true);
  };

  const columns = buildLoginColumns(handleMoreInfo);

  useEffect(() => {
    if (!modalOpen || !selectedLogin?.uuid) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchLoginDetail(selectedLogin.uuid)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetailError(loginApiErrorMessage(e, "Could not load login detail."));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, selectedLogin?.uuid]);

  const displayLogin =
    selectedLogin && detail
      ? mergeDetailBasics(selectedLogin, detail)
      : selectedLogin;

  return (
    <>
      <DataTable<LoginActivity>
        columns={columns}
        data={data}
        filters={loginFilters}
        rangeLabel="logins"
        isLoading={isLoading ?? false}
        serverSide={serverSide}
        {...(!serverSide
          ? {
              searchKey: "user_name",
              dateRangeFilter: { dateAccessorKey: "logged_at" },
            }
          : {})}
      />
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Login Details</DialogTitle>
          </DialogHeader>
          {displayLogin && (
            <div className="grid gap-3 py-2 text-sm">
              {detailError ? (
                <p className="text-destructive text-sm">{detailError}</p>
              ) : null}
              {detailLoading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : null}
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">ID</span>
                <LoginIdBadge id={displayLogin.id} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Reference</span>
                <LoginIdBadge id={displayLogin.reference_id} />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">UUID</span>
                <span className="font-mono text-xs break-all">{displayLogin.uuid}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">User</span>
                <span>{displayLogin.user_name}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="break-all">{displayLogin.email || "—"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Logged at</span>
                <span className="font-mono text-xs">
                  {formatDate(displayLogin.logged_at)}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">IP address</span>
                {displayLogin.ip_address?.trim() ? (
                  <LoginIpBadge ip={displayLogin.ip_address} />
                ) : (
                  <span>—</span>
                )}
              </div>
              {detail?.proxy_ip_address?.trim() ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">Proxy IP</span>
                  <LoginIpBadge ip={detail.proxy_ip_address} />
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Device / Source</span>
                <span className="break-words">{displayLogin.device_info || "—"}</span>
              </div>
              {detail ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">Device info (raw)</span>
                  <span className="break-all font-mono text-xs">
                    {stringifyLoginDeviceInfo(detail.device_info) || "—"}
                  </span>
                </div>
              ) : null}
              {displayLogin.user_agent ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">User agent</span>
                  <span className="break-all">
                    {displayLogin.user_agent}
                  </span>
                </div>
              ) : null}
              {detail != null ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">Inspections</span>
                  <span>{detail.inspections_done}</span>
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Status</span>
                <LoginStatusBadge success={displayLogin.success} />
              </div>
              {detail?.inspections?.length ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">Related</span>
                  <div className="flex flex-col gap-1">
                    {detail.inspections.map((insp) => (
                      <Link
                        key={insp.uuid}
                        to={PAGES.inspectionViewPath(insp.uuid)}
                        className="text-primary text-xs hover:underline"
                      >
                        {insp.uuid}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
