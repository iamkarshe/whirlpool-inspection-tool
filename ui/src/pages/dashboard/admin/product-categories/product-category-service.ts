/** Aligned with backend ProductCategory: id, name */
export interface ProductCategory {
  id: number;
  name: string;
}

export const productCategories: ProductCategory[] = [
  { id: 1, name: "Front Load Washing Machines" },
  { id: 2, name: "Top Load Washing Machines" },
  { id: 3, name: "Double Door Refrigerators" },
  { id: 4, name: "Single Door Refrigerators" },
];

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(productCategories);
    }, 2000);
  });
};
