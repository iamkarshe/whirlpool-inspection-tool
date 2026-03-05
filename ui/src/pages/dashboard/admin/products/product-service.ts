export type ProductStatus = "active" | "inactive";

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  status: ProductStatus;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Front Load Washer",
    sku: "WH-FL-1001",
    category: "Washing Machines",
    price: 799,
    status: "active",
  },
  {
    id: 2,
    name: "Top Load Washer",
    sku: "WH-TL-2003",
    category: "Washing Machines",
    price: 649,
    status: "active",
  },
  {
    id: 3,
    name: "Stacked Washer Dryer",
    sku: "WH-SD-3005",
    category: "Washer-Dryer Combo",
    price: 1199,
    status: "inactive",
  },
];

export const getProducts = async (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(products);
    }, 1500);
  });
};

