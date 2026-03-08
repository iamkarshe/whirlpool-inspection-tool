import CsvUploadDialog from "@/components/csv-upload-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

type ProductCategoryFormValues = {
  name: string;
};

type SubmitEvent = FormEvent<HTMLFormElement>;

export default function ProductCategoriesPage() {
  const [formValues, setFormValues] = useState<ProductCategoryFormValues>({
    name: "",
  });

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleCreateCategory = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real create call; for now this is mocked.
    console.log("Mock create product category", formValues);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const categoryCsvTemplate =
    "name\n" + "Front Load Washing Machines\n";

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Product Categories"
        description="Manage master data for all product categories."
      >
        <CsvUploadDialog
          title="Upload Product Categories"
          description="Select a CSV file containing product categories to import."
          templateFilename="product-categories-template.csv"
          templateContent={categoryCsvTemplate}
          onSubmit={handleCsvSubmit}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <span className="mr-1">+</span>
              Add Product Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add product category</DialogTitle>
              <DialogDescription>
                Create a new product category for use across the system.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActionBar>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <ProductCategoriesDataTable data={categories} />
      )}
    </div>
  );
}
