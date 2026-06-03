import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SmtpTestConnectionResponse } from "@/api/generated/model/smtpTestConnectionResponse";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testing: boolean;
  result: SmtpTestConnectionResponse | null;
  requestError: string | null;
  useFormValues: boolean;
  onRunTest: (toEmail: string) => void;
};

export function SmtpTestConnectionDialog({
  open,
  onOpenChange,
  testing,
  result,
  requestError,
  onRunTest,
}: Props) {
  const [toEmail, setToEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setTimeout(() => setToEmail(""), 0);
    }
  }, [open]);

  const handleRun = () => {
    const trimmed = toEmail.trim();
    if (!trimmed) return;
    onRunTest(trimmed);
  };

  const showResult = Boolean(result || requestError);
  const succeeded = result?.success === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 px-6 pt-6 pb-2">
          <DialogTitle>Test email connection</DialogTitle>
          <DialogDescription>
            Sends a test message using SMTP settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-2">
          <div className="grid gap-2">
            <Label htmlFor="smtp_test_to_email">Recipient email</Label>
            <Input
              id="smtp_test_to_email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={testing}
            />
          </div>

          {showResult ? (
            <div className="space-y-3">
              {requestError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Request failed</AlertTitle>
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              ) : result ? (
                <Alert variant={succeeded ? "default" : "destructive"}>
                  {succeeded ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {succeeded ? "Connection successful" : "Connection failed"}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{result.message}</p>
                    {result.host || result.port ? (
                      <p className="text-muted-foreground text-xs">
                        {[
                          result.provider,
                          result.host,
                          result.port ? `port ${result.port}` : null,
                          result.to_email ? `→ ${result.to_email}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              {result?.error_trace ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Error trace
                  </p>
                  <ScrollArea className="h-[min(240px,40vh)] rounded-md border bg-muted/40">
                    <pre
                      className={cn(
                        "p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap",
                        succeeded
                          ? "text-muted-foreground"
                          : "text-destructive/90",
                      )}
                    >
                      {result.error_trace}
                    </pre>
                  </ScrollArea>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 px-6 pt-2 pb-6 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={testing}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleRun}
            disabled={testing || !toEmail.trim()}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send test email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
