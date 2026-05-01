import { useEffect, useState } from "react";

import CsvUploadDialog from "@/components/csv-upload-dialog";
import ConfirmDeleteDialog from "@/components/dialog-confirm-delete";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] =
    useState<ProductCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getProductCategories();
        setCategories(data);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCsvSubmit = (file: File) => {
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock CSV upload", file);
  };

  const categoryCsvTemplate = "name\n" + "Front Load Washing Machines\n";

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Product Categories"
        description="Manage master data for all product categories."
      >
        <CsvUploadDialog
          title="Upload Products"
          description="Select a CSV file containing products to import."
          templateFilename="product-categories-template.csv"
          templateContent={categoryCsvTemplate}
          onSubmit={handleCsvSubmit}
        />
      </PageActionBar>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <ProductCategoriesDataTable
          data={categories}
          onDeleteCategory={(category) => setCategoryToDelete(category)}
        />
      )}

      <ConfirmDeleteDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
        entityLabel="product category"
        title="Delete product category?"
        description={
          categoryToDelete
            ? `You are about to permanently delete the product category "${categoryToDelete.name}". This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete category"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!categoryToDelete) return;
          try {
            setIsDeleting(true);
            // TODO: wire real delete API; mocked for now.
            console.log("Mock delete product category", categoryToDelete);
          } finally {
            setIsDeleting(false);
            setCategoryToDelete(null);
          }
        }}
      />
    </div>
  );
}
