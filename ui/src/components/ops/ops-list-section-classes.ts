import { cn } from "@/lib/utils";

/** Section shell: vertical center when the list is empty and not loading. */
export function opsListEmptySectionClassName(loading: boolean, empty: boolean) {
  return cn(
    "space-y-2",
    !loading &&
      empty &&
      "flex min-h-[min(52vh,22rem)] flex-col items-center justify-center py-6",
  );
}
