import type { ProductResponse } from "@/api/generated/model/productResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";

const columns: ColumnDef<ProductResponse>[] = [
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
  },
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
    cell: ({ row }) => (
      <Link
        to={PAGES.productViewPath(row.original.id)}
        className="font-mono text-sm text-primary hover:underline"
      >
        {row.original.material_code}
      </Link>
    ),
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
  },
  {
    accessorKey: "product_category_name",
    header: "Category",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

export default function ProductCategoryProductsDataTable({
  rows,
}: {
  rows: ProductResponse[];
}) {
  return (
    <DataTable<ProductResponse>
      columns={columns}
      data={rows}
      searchKey="material_code"
      rangeLabel="products"
      downloadCsvFileName="product-category-products.csv"
      downloadCsv={(data) => ({
        headers: [
          "id",
          "uuid",
          "product_category_id",
          "product_category_name",
          "material_code",
          "material_description",
          "is_active",
          "created_at",
          "updated_at",
        ],
        rows: data.map((p) => ({
          id: p.id,
          uuid: p.uuid,
          product_category_id: p.product_category_id,
          product_category_name: p.product_category_name,
          material_code: p.material_code,
          material_description: p.material_description,
          is_active: p.is_active,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })),
      })}
    />
  );
}
