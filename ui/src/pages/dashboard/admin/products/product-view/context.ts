import type { ProductResponse } from "@/api/generated/model/productResponse";
import type { DateRange } from "react-day-picker";

export type ProductViewContext = {
  productUuid: string;
  product: ProductResponse | null;
  categoryUuid: string | null;
  dateRange?: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
};
