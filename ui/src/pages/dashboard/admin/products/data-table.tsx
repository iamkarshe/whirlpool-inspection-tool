import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { ProductListItemResponse } from "@/api/generated/model/productListItemResponse";
import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableServerSideConfig } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

function buildProductColumns(): ColumnDef<ProductListItemResponse>[] {
  return [
    {
      accessorKey: "material_code",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Material code
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Link
            to={PAGES.productViewPath(p.uuid)}
            className="font-mono text-sm text-primary hover:underline"
          >
            {row.getValue("material_code")}
          </Link>
        );
      },
    },
    {
      accessorKey: "material_description",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Material description
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("material_description"),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created at
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("created_at"),
    },
    {
      accessorKey: "product_category_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return <span>{row.getValue("product_category_name")}</span>;
      },
    },
    {
      id: "inspections_total",
      header: "Total inspections",
      cell: ({ row }) => {
        const p = row.original;
        const href = `${PAGES.productViewPath(p.uuid)}/inspections`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="secondary" className={linkBadgeClass}>
              <ClipboardList />
              {p.inspections_count}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inspections_inbound_passed",
      header: "Inbound passed",
      cell: ({ row }) => {
        const p = row.original;
        const href = `${PAGES.productViewPath(p.uuid)}/inspections/inbound`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="success" className={linkBadgeClass}>
              <ArrowDownToLine />
              <CheckCircle2 />
              {p.inspection_inbound_approved}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inspections_inbound_failed",
      header: "Inbound failed",
      cell: ({ row }) => {
        const p = row.original;
        const href = `${PAGES.productViewPath(p.uuid)}/inspections/inbound-failed`;
        return (
          <Link to={href} className="inline-block">
            <Badge
              variant="destructive"
              className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
            >
              <ArrowDownToLine />
              <XCircle />
              {p.inspection_inbound_rejected}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inspections_outbound_passed",
      header: "Outbound passed",
      cell: ({ row }) => {
        const p = row.original;
        const href = `${PAGES.productViewPath(p.uuid)}/inspections/outbound`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="success" className={linkBadgeClass}>
              <ArrowUpFromLine />
              <CheckCircle2 />
              {p.inspection_outbound_approved}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inspections_outbound_failed",
      header: "Outbound failed",
      cell: ({ row }) => {
        const p = row.original;
        const href = `${PAGES.productViewPath(p.uuid)}/inspections/outbound-failed`;
        return (
          <Link to={href} className="inline-block">
            <Badge
              variant="destructive"
              className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
            >
              <ArrowUpFromLine />
              <XCircle />
              {p.inspection_outbound_rejected}
            </Badge>
          </Link>
        );
      },
    },
  ];
}

interface ProductsDataTableProps {
  data: ProductListItemResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function ProductsDataTable({
  data,
  serverSide,
  isLoading,
}: ProductsDataTableProps) {
  const productColumns = buildProductColumns();

  return (
    <DataTable<ProductListItemResponse>
      columns={productColumns}
      data={data}
      rangeLabel="products"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
