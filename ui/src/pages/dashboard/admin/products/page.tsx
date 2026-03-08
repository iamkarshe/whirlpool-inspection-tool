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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductsDataTable from "./data-table";
import {
  getProducts,
  type Product,
} from "@/pages/dashboard/admin/products/product-service";
import {
  getProductCategories,
  type ProductCategory,
} from "@/pages/dashboard/admin/product-categories/product-category-service";
import { FileDown, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

type ProductFormValues = {
  product_category_id: number;
  serial_number: string;
  manufacturing_date: string;
  batch_number: string;
};

type SubmitEvent = FormEvent<HTMLFormElement>;

export default function ProductsPage() {
  const [formValues, setFormValues] = useState<ProductFormValues>({
    product_category_id: 0,
    serial_number: "",
    manufacturing_date: "",
    batch_number: "",
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getProductCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductsAndCategories();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real create product; mocked for now.
    console.log("Mock create product", formValues);
  };

  const handleCsvSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock products CSV upload", csvFile);
  };

  const handleDownloadTemplate = () => {
    const header = "serial_number,manufacturing_date,batch_number,product_category_id\n";
    const exampleRow =
      "WH-FL-2024-001234,2024-01-15,BATCH-FL-2401,1\n";
    const csvContent = `${header}${exampleRow}`;

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "products-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
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
              <DialogTitle>Upload Products</DialogTitle>
              <DialogDescription>
                Select a CSV file containing products to import.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCsvSubmit}>
              <div className="space-y-2">
                <Label htmlFor="productsCsv">CSV file</Label>
                <Input
                  id="productsCsv"
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
            <Button>
              <span className="mr-1">+</span>
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add product</DialogTitle>
              <DialogDescription>
                Create a new product for the catalog.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={
                    formValues.product_category_id
                      ? String(formValues.product_category_id)
                      : ""
                  }
                  onValueChange={(value) =>
                    setFormValues((previous) => ({
                      ...previous,
                      product_category_id: value ? Number(value) : 0,
                    }))
                  }
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial number</Label>
                <Input
                  id="serial_number"
                  name="serial_number"
                  value={formValues.serial_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturing_date">Manufacturing date</Label>
                <Input
                  id="manufacturing_date"
                  name="manufacturing_date"
                  type="date"
                  value={formValues.manufacturing_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch number</Label>
                <Input
                  id="batch_number"
                  name="batch_number"
                  value={formValues.batch_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActionBar>

      {isLoading ? <SkeletonTable /> : <ProductsDataTable data={products} />}
    </div>
  );
}
