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
import ProductsDataTable from "./data-table";
import {
  getProducts,
  type Product,
} from "@/pages/dashboard/admin/products/product-service";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

type ProductFormValues = {
  name: string;
  sku: string;
  category: string;
  price: string;
};

export default function ProductsPage() {
  const [formValues, setFormValues] = useState<ProductFormValues>({
    name: "",
    sku: "",
    category: "",
    price: "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real create product; mocked for now.
    console.log("Mock create product", formValues);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
      >
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
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formValues.sku}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={formValues.category}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
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

