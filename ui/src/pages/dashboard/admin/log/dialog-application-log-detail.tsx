import { useMemo, useState } from "react";

import { DetailKeyValueList } from "@/components/detail-key-value-list";
import type { ApplicationLogRow } from "@/pages/dashboard/admin/log/log-types";
import {
  listLogDetailEntries,
  readLogDetailBoolean,
  readLogDetailString,
  sourceTabMatchesRow,
} from "@/pages/dashboard/admin/log/log-details-utils";
import {
  LogLevelBadge,
  LogSourceBadge,
} from "@/pages/dashboard/admin/log/log-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/core";

export type DialogApplicationLogDetailProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ApplicationLogRow | null;
  activeSource: string | null;
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-sm">{value}</span>
    </div>
  );
}

export function DialogApplicationLogDetail({
  open,
  onOpenChange,
  log,
  activeSource,
}: DialogApplicationLogDetailProps) {
  const [emailPreview, setEmailPreview] = useState<"text" | "html">("text");

  const isEmailLog = useMemo(() => {
    if (!log) return false;
    if (sourceTabMatchesRow("EMAIL", log.source)) return true;
    return log.source.trim().toUpperCase() === "EMAIL";
  }, [log]);

  const bodyText = log ? readLogDetailString(log.details, "body_text") : null;
  const bodyHtml = log ? readLogDetailString(log.details, "body_html") : null;
  const rawDetailEntries = useMemo(
    () => (log ? listLogDetailEntries(log.details) : []),
    [log],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log details</DialogTitle>
          {log ? (
            <DialogDescription>
              {log.source} · {formatDate(log.created_at)}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {log ? (
          <div className="grid gap-3 py-2 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Level</span>
              <LogLevelBadge level={log.levelKey} />
            </div>
            {!activeSource ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Source</span>
                <LogSourceBadge source={log.source} />
              </div>
            ) : null}
            <DetailRow label="Message" value={log.message} />
            <DetailRow
              label="Email"
              value={readLogDetailString(log.details, "attempted_email")}
            />
            <DetailRow
              label="Email"
              value={readLogDetailString(log.details, "target_email")}
            />
            <DetailRow
              label="To"
              value={readLogDetailString(log.details, "to_email")}
            />
            <DetailRow
              label="From"
              value={readLogDetailString(log.details, "from_email")}
            />
            <DetailRow
              label="Subject"
              value={readLogDetailString(log.details, "subject")}
            />
            <DetailRow
              label="IP"
              value={readLogDetailString(log.details, "ip")}
            />
            <DetailRow
              label="Login method"
              value={readLogDetailString(log.details, "login_method")}
            />
            <DetailRow
              label="Role"
              value={readLogDetailString(log.details, "target_role")}
            />
            {readLogDetailBoolean(log.details, "welcome_email_sent") !==
            null ? (
              <DetailRow
                label="Welcome email"
                value={
                  readLogDetailBoolean(log.details, "welcome_email_sent")
                    ? "Sent"
                    : "Not sent"
                }
              />
            ) : null}
            <DetailRow
              label="Email kind"
              value={readLogDetailString(log.details, "email_kind")}
            />
            <DetailRow
              label="Delivery"
              value={readLogDetailString(log.details, "delivery_mode")}
            />

            {isEmailLog && (bodyText || bodyHtml) ? (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Email preview</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={emailPreview === "text" ? "default" : "outline"}
                      disabled={!bodyText}
                      onClick={() => setEmailPreview("text")}
                    >
                      Plain text
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={emailPreview === "html" ? "default" : "outline"}
                      disabled={!bodyHtml}
                      onClick={() => setEmailPreview("html")}
                    >
                      HTML
                    </Button>
                  </div>
                </div>
                {emailPreview === "html" && bodyHtml ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-background p-3"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                ) : (
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                    {bodyText ?? "No plain-text body available."}
                  </pre>
                )}
              </div>
            ) : null}

            <DetailKeyValueList title="" entries={rawDetailEntries} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
