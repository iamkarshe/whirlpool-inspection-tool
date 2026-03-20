import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Trash2 } from "lucide-react";
import {
  ProductCategoryChecklistsCountBadge,
  ProductCategoryProductsCountBadge,
} from "./product-category-badge";
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
          cell: ({ row }) => row.getValue("name"),
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
          id: "checklists",
          header: "Checklists",
          cell: ({ row }) => {
            const c = row.original;
            return (
              <ProductCategoryChecklistsCountBadge
                categoryId={c.id}
                count={c.checklists_count ?? 0}
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
    />
  );
}
