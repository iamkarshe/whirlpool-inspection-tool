/**
 * Aligned with backend ProductCategory: id, name.
 * Optional counts are for list/table display (mock or from API).
 */
export interface ProductCategory {
  id: number;
  name: string;
  /** Mock/API: number of products in this category. */
  products_count?: number;
  /** Mock/API: number of inspection checklists for this category. */
  checklists_count?: number;
}

export const productCategories: ProductCategory[] = [
  {
    id: 1,
    name: "Front Load Washing Machines",
    products_count: 1,
    checklists_count: 1,
  },
  {
    id: 2,
    name: "Top Load Washing Machines",
    products_count: 1,
    checklists_count: 1,
  },
  {
    id: 3,
    name: "Double Door Refrigerators",
    products_count: 1,
    checklists_count: 1,
  },
  {
    id: 4,
    name: "Single Door Refrigerators",
    products_count: 0,
    checklists_count: 0,
  },
];

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(productCategories);
    }, 2000);
  });
};

export const getProductCategoryById = async (
  id: number,
): Promise<ProductCategory | null> => {
  const list = await getProductCategories();
  return list.find((c) => c.id === id) ?? null;
};
