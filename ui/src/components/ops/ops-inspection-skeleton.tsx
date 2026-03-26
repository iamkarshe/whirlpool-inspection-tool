import { Skeleton } from "@/components/ui/skeleton";

function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-52" />
        </div>
      </div>

      <div className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function OpsInspectionSkeleton({
  variant = "list",
  count = 3,
}: {
  variant?: "list" | "detail";
  count?: number;
}) {
  if (variant === "detail") return <DetailSkeleton />;
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
}
