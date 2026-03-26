import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bug } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type RaiseIssueTarget =
  | { type: "inspection"; inspectionId: string }
  | {
      type: "image";
      inspectionId: string;
      imageUrl: string;
      imageFilename?: string;
    };

export type IssueSeverity = "low" | "medium" | "high";

export type IssueType =
  | "damage"
  | "wrong_image_capture"
  | "low_quality_image_capture"
  | "other";

export type RaiseIssuePayload = {
  target: RaiseIssueTarget;
  title: string;
  description: string;
  severity: IssueSeverity;
  type: IssueType;
};

export function RaiseIssueDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
  title = "Raise an issue",
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: RaiseIssueTarget;
  onSubmit?: (payload: RaiseIssuePayload) => void | Promise<void>;
  title?: string;
  description?: string;
}) {
  const targetText = useMemo(() => {
    if (target.type === "inspection")
      return `Inspection: ${target.inspectionId}`;
    return `Image: ${target.imageFilename ?? "image"} (Inspection: ${target.inspectionId})`;
  }, [target]);

  const [issueTitle, setIssueTitle] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity | null>(
    null,
  );
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIssueTitle("");
    setIssueSeverity(null);
    setIssueType(null);
    setIssueDescription("");
    setSubmitting(false);
  }, [open, targetText]);

  const canSubmit =
    issueTitle.trim().length > 0 &&
    issueSeverity != null &&
    issueType != null &&
    issueDescription.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Flag an issue for follow-up and reporting."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto pr-2",
            "[scrollbar-width:thin]",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
            "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
          )}
        >
          <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <div className="text-muted-foreground">Target</div>
            <div className="mt-1 text-xs break-all">{targetText}</div>
          </div>

          {target.type === "image" ? (
            <div className="rounded-md border bg-muted/20 p-2">
              <img
                src={target.imageUrl}
                alt={target.imageFilename ?? "Issue image"}
                className={cn(
                  "h-48 w-full rounded object-contain bg-background",
                )}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="issue_title">Title</Label>
            <Input
              id="issue_title"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="Short summary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_severity">Severity</Label>
              <Select
                value={issueSeverity ?? ""}
                onValueChange={(v) => setIssueSeverity(v as IssueSeverity)}
              >
                <SelectTrigger id="issue_severity" className="w-full">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_type">Type</Label>
              <Select
                value={issueType ?? ""}
                onValueChange={(v) => setIssueType(v as IssueType)}
              >
                <SelectTrigger id="issue_type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="wrong_image_capture">
                    Wrong image capture
                  </SelectItem>
                  <SelectItem value="low_quality_image_capture">
                    Low quality image capture
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_desc">Description</Label>
            <Textarea
              id="issue_desc"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="What went wrong? Include details..."
              rows={5}
            />
          </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const payload: RaiseIssuePayload = {
                target,
                title: issueTitle.trim(),
                description: issueDescription.trim(),
                severity: issueSeverity ?? "low",
                type: issueType ?? "other",
              };
              setSubmitting(true);
              try {
                await onSubmit?.(payload);
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !canSubmit}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
