import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type StatusBadgeTone = "violet" | "amber";

const toneStyles: Record<
  StatusBadgeTone,
  {
    badge: string;
    panelAccent: string;
    iconWrap: string;
    icon: string;
    footer: string;
  }
> = {
  violet: {
    badge:
      "gap-1 border-violet-400/70 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-800 uppercase hover:bg-violet-500/15 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-100",
    panelAccent: "border-violet-200/80 bg-violet-500/[0.06] dark:border-violet-500/25",
    iconWrap:
      "border-violet-300/70 bg-violet-500/10 dark:border-violet-500/40 dark:bg-violet-500/15",
    icon: "text-violet-700 dark:text-violet-200",
    footer: "border-violet-200/60 bg-violet-500/[0.04] dark:border-violet-500/20",
  },
  amber: {
    badge:
      "gap-1 border-amber-400/70 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-950 uppercase hover:bg-amber-500/15 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100",
    panelAccent: "border-amber-200/80 bg-amber-500/[0.06] dark:border-amber-500/25",
    iconWrap:
      "border-amber-300/70 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/15",
    icon: "text-amber-800 dark:text-amber-200",
    footer: "border-amber-200/60 bg-amber-500/[0.04] dark:border-amber-500/20",
  },
};

type StatusBadgeTriggerProps = {
  tone: StatusBadgeTone;
  icon: LucideIcon;
  label: string;
  className?: string;
  "aria-label": string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

export function StatusBadgeTrigger({
  tone,
  icon: Icon,
  label,
  className,
  "aria-label": ariaLabel,
  onClick,
}: StatusBadgeTriggerProps) {
  const styles = toneStyles[tone];

  return (
    <button
      type="button"
      className={cn("inline-flex shrink-0 rounded-full", className)}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <Badge variant="outline" className={styles.badge}>
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </Badge>
    </button>
  );
}

type StatusBadgePanelProps = {
  tone: StatusBadgeTone;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
};

export function StatusBadgePanel({
  tone,
  icon: Icon,
  title,
  description,
  actions,
}: StatusBadgePanelProps) {
  const styles = toneStyles[tone];

  return (
    <div className="overflow-hidden">
      <div className={cn("border-b p-4", styles.panelAccent)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              styles.iconWrap,
            )}
          >
            <Icon className={cn("h-4 w-4", styles.icon)} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1.5 pt-0.5">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {title}
            </p>
            <div className="text-muted-foreground text-xs leading-relaxed">
              {description}
            </div>
          </div>
        </div>
      </div>

      {actions ? (
        <div className={cn("flex flex-wrap items-center gap-2 border-t p-3", styles.footer)}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type StatusBadgeDialogProps = {
  tone: StatusBadgeTone;
  icon: LucideIcon;
  label: string;
  title: string;
  description: ReactNode;
  descriptionText?: string;
  actions?: ReactNode;
  className?: string;
  "aria-label": string;
};

export function StatusBadgeDialog({
  tone,
  icon,
  label,
  title,
  description,
  descriptionText,
  actions,
  className,
  "aria-label": ariaLabel,
}: StatusBadgeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <StatusBadgeTrigger
        tone={tone}
        icon={icon}
        label={label}
        className={className}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      />
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[101] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {descriptionText ?? (typeof description === "string" ? description : title)}
        </DialogDescription>
        <StatusBadgePanel
          tone={tone}
          icon={icon}
          title={title}
          description={description}
          actions={actions}
        />
      </DialogContent>
    </Dialog>
  );
}
