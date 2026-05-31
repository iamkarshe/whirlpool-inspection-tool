import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  jobApiErrorMessage,
  runAutoApproveInspectionsJob,
} from "@/services/jobs-api";

export type RunAutoApproveJobDialogProps = {
  onSuccess?: () => void;
};

export function RunAutoApproveJobDialog({
  onSuccess,
}: RunAutoApproveJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setToken("");
      setResult(null);
      setError(null);
    }
  };

  const handleRun = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Job access token is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runAutoApproveInspectionsJob(trimmed);
      const summary = `${response.message} (${response.rows_updated.toLocaleString()} row(s) updated)`;
      setResult(summary);
      toast.success("Auto-approve job finished.");
      onSuccess?.();
    } catch (e) {
      const message = jobApiErrorMessage(e, "Failed to run auto-approve job.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "border-emerald-200/90 bg-emerald-50/90 text-emerald-800 shadow-xs",
            "hover:bg-emerald-100 hover:text-emerald-900",
            "dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200",
            "dark:hover:bg-emerald-950/55 dark:hover:text-emerald-100",
          )}
        >
          <Play className="h-4 w-4" aria-hidden />
          Auto Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run auto-approve job</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="job-execute-token">Job access token</Label>
            <Input
              id="job-execute-token"
              type="password"
              autoComplete="off"
              placeholder="x-job-execute-token value"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={loading}
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <p className="text-sm text-foreground" role="status">
              {result}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void handleRun()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Running…
              </>
            ) : (
              "Run job"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
