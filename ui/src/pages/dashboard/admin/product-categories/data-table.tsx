import {
  ArrowUpDown,
  BarChart3,
  LineChart,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { InspectionCountBadge } from "@/components/inspections/inspection-count-badges";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import { ProductCategoryProductsCountBadge } from "./product-category-badge";
import type { ProductCategory } from "./product-category-service";

interface ProductCategoriesDataTableProps {
  data: ProductCategory[];
  onDeleteCategory?: (category: ProductCategory) => void;
}

export default function ProductCategoriesDataTable({
  data,
  onDeleteCategory,
}: ProductCategoriesDataTableProps) {
  return (
    <DataTable<ProductCategory>
      columns={[
        {
          accessorKey: "name",
          header: ({ column }) => (
            <Button
              className="-ml-3"
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Name
              <ArrowUpDown className="ml-1 h-4 w-4" />
            </Button>
          ),
          cell: ({ row }) => {
            const c = row.original;
            return (
              <Link
                to={PAGES.productCategoryViewPath(c.id)}
                className="text-primary hover:underline"
              >
                {row.getValue("name")}
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
                categoryId={c.id}
                count={c.products_count ?? 0}
              />
            );
          },
        },
        {
          id: "inspections_total",
          header: "Total inspections",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <InspectionCountBadge
                scope={{ productCategoryId: c.id }}
                kind="total"
                linkBasePath={PAGES.productCategoryViewPath(c.id)}
              />
            );
          },
        },
        {
          id: "inspections_inbound_passed",
          header: "Inbound passed",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <InspectionCountBadge
                scope={{ productCategoryId: c.id }}
                kind="inboundPassed"
                linkBasePath={PAGES.productCategoryViewPath(c.id)}
              />
            );
          },
        },
        {
          id: "inspections_inbound_failed",
          header: "Inbound failed",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <InspectionCountBadge
                scope={{ productCategoryId: c.id }}
                kind="inboundFailed"
                linkBasePath={PAGES.productCategoryViewPath(c.id)}
              />
            );
          },
        },
        {
          id: "inspections_outbound_passed",
          header: "Outbound passed",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <InspectionCountBadge
                scope={{ productCategoryId: c.id }}
                kind="outboundPassed"
                linkBasePath={PAGES.productCategoryViewPath(c.id)}
              />
            );
          },
        },
        {
          id: "inspections_outbound_failed",
          header: "Outbound failed",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <InspectionCountBadge
                scope={{ productCategoryId: c.id }}
                kind="outboundFailed"
                linkBasePath={PAGES.productCategoryViewPath(c.id)}
              />
            );
          },
        },
        {
          id: "actions",
          enableHiding: false,
          cell: ({ row }) => {
            const category = row.original;
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
                      to={`${PAGES.DASHBOARD_REPORTS_OPERATIONS_ANALYTICS}?product_category_id=${category.id}`}
                      className="flex items-center"
                    >
                      <LineChart className="mr-2 h-4 w-4" />
                      Operations Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={`${PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS}?product_category_id=${category.id}`}
                      className="flex items-center"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Executive Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      onDeleteCategory?.(category);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Delete category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ]}
      data={data}
      searchKey="name"
      rangeLabel="product categories"
    />
  );
}
