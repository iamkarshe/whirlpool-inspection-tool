import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SkeletonTable() {
  return (
    <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground my-5 rounded-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-4 py-4">
          <div className="flex flex-1 items-center gap-2">
            <Skeleton className="h-9 w-[220px]" />
            <Skeleton className="h-8 w-[90px]" />
            <Skeleton className="h-8 w-[90px]" />
          </div>
          <Skeleton className="h-8 w-[110px]" />
        </div>

        <div className="rounded-lg border">
          <Table className="mx-auto">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-3 w-[100px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-3 w-[100px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-3 w-[100px]" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-3 w-[100px]" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
