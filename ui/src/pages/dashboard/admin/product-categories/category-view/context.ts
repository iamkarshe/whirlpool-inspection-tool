import type { ProductCategoryResponse } from "@/api/generated/model/productCategoryResponse";
import type { DateRange } from "react-day-picker";

export type ProductCategoryViewContext = {
  categoryUuid: string;
  category: ProductCategoryResponse | null;
  dateRange?: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};
