import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import type { DataTableServerSideConfig } from "@/components/ui/data-table";
import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { ProductCategoryProductsCountBadge } from "@/pages/dashboard/admin/product-categories/product-category-badge";
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

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

interface ProductCategoriesDataTableProps {
  data: ProductCategoryListItemResponse[];
  serverSide: DataTableServerSideConfig;
  isLoading?: boolean;
}

export default function ProductCategoriesDataTable({
  data,
  serverSide,
  isLoading,
}: ProductCategoriesDataTableProps) {
  const columns: ColumnDef<ProductCategoryListItemResponse>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const c = row.original;
        return (
          <Link
            to={PAGES.productCategoryViewPath(c.uuid)}
            className="text-primary hover:underline"
          >
            {c.name}
          </Link>
        );
      },
    },
    {
      id: "products",
      header: "Products",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <ProductCategoryProductsCountBadge
            categoryUuid={c.uuid}
            count={c.products_count}
          />
        );
      },
    },
    {
      id: "inspections_total",
      header: "Total inspections",
      cell: ({ row }) => {
        const c = row.original;
        const href = `${PAGES.productCategoryViewPath(c.uuid)}/inspections`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="secondary" className={linkBadgeClass}>
              <ClipboardList />
              {c.inspections_count}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inbound_approved",
      header: "Inbound approved",
      cell: ({ row }) => {
        const c = row.original;
        const href = `${PAGES.productCategoryViewPath(c.uuid)}/inspections/inbound`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="success" className={linkBadgeClass}>
              <ArrowDownToLine />
              <CheckCircle2 />
              {c.inspection_inbound_approved}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "inbound_rejected",
      header: "Inbound rejected",
      cell: ({ row }) => {
        const c = row.original;
        const href = `${PAGES.productCategoryViewPath(c.uuid)}/inspections/inbound-failed`;
        return (
          <Link to={href} className="inline-block">
            <Badge
              variant="destructive"
              className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
            >
              <ArrowDownToLine />
              <XCircle />
              {c.inspection_inbound_rejected}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "outbound_approved",
      header: "Outbound approved",
      cell: ({ row }) => {
        const c = row.original;
        const href = `${PAGES.productCategoryViewPath(c.uuid)}/inspections/outbound`;
        return (
          <Link to={href} className="inline-block">
            <Badge variant="success" className={linkBadgeClass}>
              <ArrowUpFromLine />
              <CheckCircle2 />
              {c.inspection_outbound_approved}
            </Badge>
          </Link>
        );
      },
    },
    {
      id: "outbound_rejected",
      header: "Outbound rejected",
      cell: ({ row }) => {
        const c = row.original;
        const href = `${PAGES.productCategoryViewPath(c.uuid)}/inspections/outbound-failed`;
        return (
          <Link to={href} className="inline-block">
            <Badge
              variant="destructive"
              className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
            >
              <ArrowUpFromLine />
              <XCircle />
              {c.inspection_outbound_rejected}
            </Badge>
          </Link>
        );
      },
    },
  ];

  return (
    <DataTable<ProductCategoryListItemResponse>
      columns={columns}
      data={data}
      rangeLabel="product categories"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
