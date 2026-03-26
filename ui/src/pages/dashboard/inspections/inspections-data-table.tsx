import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import {
  InspectionIdLinkBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Smartphone } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export type InspectionsDataTableProps = {
  data: Inspection[];
  /** When true, hide the Device column (e.g. on device inspections tab). */
  hideDeviceColumn?: boolean;
};

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

const deviceColumn: ColumnDef<Inspection> = {
  id: "device",
  accessorKey: "device_fingerprint",
  header: ({ column }) => (
    <Button
      className="-ml-3"
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Device
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => (
    <Link
      to={PAGES.deviceViewPath(row.original.device_id)}
      className="text-primary hover:underline"
    >
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Smartphone className="h-3.5 w-3.5" />
        {row.original.device_fingerprint}
      </span>
    </Link>
  ),
};

export default function InspectionsDataTable({
  data,
  hideDeviceColumn = false,
}: InspectionsDataTableProps) {
  const columns: ColumnDef<Inspection>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspection ID
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <InspectionIdLinkBadge id={row.original.id} />
      ),
    },
    {
      accessorKey: "inspector_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspector
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          to={PAGES.userViewPath(row.original.inspector_id)}
          className="text-primary hover:underline"
        >
          {row.getValue("inspector_name")}
        </Link>
      ),
      filterFn: (row, _columnId, filterValue) =>
        row.getValue("inspector_name") === filterValue,
    },
    ...(hideDeviceColumn ? [] : [deviceColumn]),
    {
      accessorKey: "product_serial",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue("product_serial")}
        </span>
      ),
      filterFn: (row, _columnId, filterValue) =>
        row.getValue("product_serial") === filterValue,
    },
    {
      accessorKey: "product_category_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product category
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.product_category_name ?? "—"}
        </span>
      ),
      filterFn: (row, _columnId, filterValue) =>
        (row.getValue("product_category_name") ?? "") === filterValue,
    },
    {
      accessorKey: "checklist_name",
      header: "Checklist",
      cell: ({ row }) => row.getValue("checklist_name"),
    },
    {
      accessorKey: "inspection_type",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <InspectionTypeBadge inspectionType={row.original.inspection_type} />
      ),
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("inspection_type") as string;
        if (filterValue === "inbound") return v === "inbound";
        if (filterValue === "outbound") return v === "outbound";
        return true;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={PAGES.inspectionViewPath(row.original.id)}>
                View inspection
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: DataTableFilter<Inspection>[] = useMemo(() => {
    const inspectorOptions = Array.from(
      new Set(data.map((i) => i.inspector_name).filter(Boolean)),
    )
      .sort()
      .map((name) => ({ value: name, label: name }));
    const categoryOptions = Array.from(
      new Set(
        data
          .map((i) => i.product_category_name)
          .filter((n): n is string => Boolean(n)),
      ),
    )
      .sort()
      .map((name) => ({ value: name, label: name }));
    const productOptions = Array.from(
      new Set(data.map((i) => i.product_serial).filter(Boolean)),
    )
      .sort()
      .map((serial) => ({ value: serial, label: serial }));
    return [
      {
        id: "inspection_type",
        title: "Type",
        options: [
          { value: "inbound", label: "Inbound" },
          { value: "outbound", label: "Outbound" },
        ],
      },
      ...(inspectorOptions.length > 0
        ? [{ id: "inspector_name" as const, title: "Inspector", options: inspectorOptions }]
        : []),
      ...(categoryOptions.length > 0
        ? [
            {
              id: "product_category_name" as const,
              title: "Product category",
              options: categoryOptions,
            },
          ]
        : []),
      ...(productOptions.length > 0
        ? [{ id: "product_serial" as const, title: "Product", options: productOptions }]
        : []),
    ];
  }, [data]);

  return (
    <DataTable<Inspection>
      columns={columns}
      data={data}
      searchKey="product_serial"
      filters={filters}
      dateRangeFilter={{ dateAccessorKey: "created_at" }}
      rangeLabel="inspections"
    />
  );
}
