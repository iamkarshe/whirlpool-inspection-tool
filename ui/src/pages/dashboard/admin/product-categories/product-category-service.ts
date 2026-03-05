export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description: string;
}

export const productCategories: ProductCategory[] = [
  {
    id: 1,
    name: "Front Load Washing Machines",
    code: "WM-FL",
    description: "Front load washing machines for residential laundry.",
  },
  {
    id: 2,
    name: "Top Load Washing Machines",
    code: "WM-TL",
    description: "Top load washing machines for home and commercial use.",
  },
  {
    id: 3,
    name: "Double Door Refrigerators",
    code: "REF-DD",
    description: "Frost-free double door refrigerators.",
  },
  {
    id: 4,
    name: "Single Door Refrigerators",
    code: "REF-SD",
    description: "Direct-cool single door refrigerators.",
  },
];

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(productCategories);
    }, 2000);
  });
};

