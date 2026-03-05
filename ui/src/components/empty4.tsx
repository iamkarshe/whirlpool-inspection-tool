import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGES } from "@/endpoints";
import { FileIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmptyComponent() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 p-4 pt-[20vh]">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <FileIcon className="size-10 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Resource Not Found</EmptyTitle>
            <EmptyDescription>
              The resource you're looking for doesn't exist.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              <Link
                to={PAGES.DASHBOARD}
                className="text-primary underline underline-offset-4"
              >
                Back to Dashboard
              </Link>
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
