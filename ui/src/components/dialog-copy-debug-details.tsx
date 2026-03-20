import { Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type CopyDebugDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  debugText: string;
  closeLabel?: string;
  copyLabel?: string;
};

export function CopyDebugDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  debugText,
  closeLabel = "Close",
  copyLabel = "Copy",
}: CopyDebugDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  const safeDebugText = useMemo(() => debugText ?? "", [debugText]);

  const copy = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!("clipboard" in navigator)) {
      toast.error("Clipboard not available");
      return;
    }

    void navigator.clipboard
      .writeText(safeDebugText)
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard");
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => toast.error("Failed to copy"));
  }, [safeDebugText]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setCopied(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="rounded-2xl border bg-muted/40 p-3">
          <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
            {safeDebugText}
          </pre>
        </div>

        <DialogFooter className="mt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
          <Button type="button" onClick={copy} disabled={!safeDebugText}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied" : copyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

