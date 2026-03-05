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
import { Textarea } from "@/components/ui/textarea";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import { FileDown, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

type ProductCategoryFormValues = {
  name: string;
  code: string;
  description: string;
};

export default function ProductCategoriesPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<ProductCategoryFormValues>({
    name: "",
    code: "",
    description: "",
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

  const handleCsvSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock CSV upload", csvFile);
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real create call; for now this is mocked.
    console.log("Mock create product category", formValues);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleDownloadTemplate = () => {
    const header = "name,code,description\n";
    const exampleRow =
      "Front Load Washing Machines,WM-FL,Front load washing machines for residential laundry.\n";
    const csvContent = `${header}${exampleRow}`;

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product-categories-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Product Categories"
        description="Manage master data for all product categories."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="mr-1 h-4 w-4" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload product categories CSV</DialogTitle>
              <DialogDescription>
                Select a CSV file containing product categories to import.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCsvSubmit}>
              <div className="space-y-2">
                <Label htmlFor="categoriesCsv">CSV file</Label>
                <Input
                  id="categoriesCsv"
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    const file =
                      event.target.files && event.target.files[0]
                        ? event.target.files[0]
                        : null;
                    setCsvFile(file);
                  }}
                />
              </div>
              <DialogFooter className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  Template CSV
                </Button>
                <Button type="submit" disabled={!csvFile}>
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Product Category</Button>
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
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={formValues.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleInputChange}
                  rows={3}
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
