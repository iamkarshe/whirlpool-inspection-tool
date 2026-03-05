import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGES } from "@/endpoints";
import { ArrowLeftIcon, FileSearch } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmptyComponent() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 p-4 pt-[10vh]">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <FileSearch className="size-7 text-primary" />
              </div>
            </EmptyMedia>
            <EmptyTitle>Nothing to show here!</EmptyTitle>
            <EmptyDescription>
              The page or data you’re looking for is unavailable or doesn’t
              exist.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              You can go back to your dashboard and continue from there.
            </EmptyDescription>
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link to={PAGES.DASHBOARD}>
                  <ArrowLeftIcon className="ml-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
