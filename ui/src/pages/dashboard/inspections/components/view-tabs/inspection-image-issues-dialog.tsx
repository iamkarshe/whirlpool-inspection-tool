import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InspectionIssueRow } from "@/pages/dashboard/inspections/components/view-tabs/inspection-flags-tab";
import { formatDate } from "@/lib/core";
import { formatIssueStatus } from "@/pages/dashboard/inspections/components/view-tabs/inspection-issue-presenters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  issues: InspectionIssueRow[];
  onResolveIssue: (issueId: string) => void;
};

export function InspectionImageIssuesDialog({
  open,
  onOpenChange,
  imageUrl,
  issues,
  onResolveIssue,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Image issues ({issues.length})</DialogTitle>
        </DialogHeader>
        {imageUrl ? (
          <div className="space-y-3">
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {issues.length === 0 ? (
                <div className="text-muted-foreground rounded-md border bg-muted/20 px-3 py-6 text-center text-sm">
                  No issues found for this image.
                </div>
              ) : (
                issues.map((issue) => (
                  <div key={issue.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {issue.description}
                        </div>
                      </div>
                      <Badge
                        variant={issue.status === "resolved" ? "success" : "destructive"}
                      >
                        {formatIssueStatus(issue.status)}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-2 text-xs">
                      {formatDate(issue.createdAt)}
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant={issue.status === "resolved" ? "secondary" : "default"}
                        disabled={issue.status === "resolved"}
                        onClick={() => onResolveIssue(issue.id)}
                      >
                        {issue.status === "resolved" ? "Resolved" : "Resolve"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
