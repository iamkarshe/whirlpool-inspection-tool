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
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useState } from "react";

type ProductFormValues = {
  product_category_id: number;
  serial_number: string;
  manufacturing_date: string;
  batch_number: string;
};

export default function ProductsPage() {
  const [formValues, setFormValues] = useState<ProductFormValues>({
    product_category_id: 0,
    serial_number: "",
    manufacturing_date: "",
    batch_number: "",
  });

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

  const handleCsvSubmit = (file: File) => {
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock products CSV upload", file);
  };

  const productsCsvTemplate =
    "serial_number,manufacturing_date,batch_number,product_category_id\n" +
    "WH-FL-2024-001234,2024-01-15,BATCH-FL-2401,1\n";

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
      >
        <CsvUploadDialog
          title="Upload Products"
          description="Select a CSV file containing products to import."
          templateFilename="products-template.csv"
          templateContent={productsCsvTemplate}
          onSubmit={handleCsvSubmit}
        />

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
