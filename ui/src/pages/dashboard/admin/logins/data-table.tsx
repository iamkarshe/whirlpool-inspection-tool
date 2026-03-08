import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const loginColumns: ColumnDef<LoginActivity>[] = [
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
      return <span className="text-muted-foreground">{log.user_name}</span>;
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
      <span className="font-mono text-xs">{row.getValue("ip_address")}</span>
    ),
  },
  {
    accessorKey: "device_info",
    header: "Device / Source",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate text-xs">
        {row.original.device_info ?? "—"}
      </span>
    ),
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
    cell: ({ row }) => {
      const success = row.original.success;
      return (
        <Badge variant={success ? "default" : "destructive"}>
          {success ? "Success" : "Failed"}
        </Badge>
      );
    },
    filterFn: (row, _columnId, filterValue) => {
      const v = row.getValue("success") as boolean;
      if (filterValue === "true") return v === true;
      if (filterValue === "false") return v === false;
      return true;
    },
  },
];

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
  return (
    <DataTable<LoginActivity>
      columns={loginColumns}
      data={data}
      searchKey="user_name"
      filters={loginFilters}
    />
  );
}
