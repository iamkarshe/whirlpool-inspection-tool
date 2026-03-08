/**
 * Aligned with backend Product: id, product_category_id, serial_number,
 * manufacturing_date, batch_number (+ mixin). category_name for display only.
 */
export interface Product {
  id: number;
  product_category_id: number;
  serial_number: string;
  manufacturing_date: string;
  batch_number: string;
  category_name: string;
}

export const products: Product[] = [
  {
    id: 1,
    product_category_id: 1,
    serial_number: "WH-FL-2024-001234",
    manufacturing_date: "2024-01-15",
    batch_number: "BATCH-FL-2401",
    category_name: "Front Load Washing Machines",
  },
  {
    id: 2,
    product_category_id: 2,
    serial_number: "WH-TL-2024-002456",
    manufacturing_date: "2024-02-20",
    batch_number: "BATCH-TL-2402",
    category_name: "Top Load Washing Machines",
  },
  {
    id: 3,
    product_category_id: 3,
    serial_number: "WH-REF-DD-2024-003789",
    manufacturing_date: "2024-03-10",
    batch_number: "BATCH-REF-2403",
    category_name: "Double Door Refrigerators",
  },
];

export const getProducts = async (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(products);
    }, 1500);
  });
};
