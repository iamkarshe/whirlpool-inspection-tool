import { ExternalLink, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getConfiguredProdAppUrl,
  isNonProductionAppHost,
} from "@/lib/app-environment";
import { cn } from "@/lib/utils";

export type UatEnvironmentBadgeProps = {
  className?: string;
};

export function UatEnvironmentBadge({ className }: UatEnvironmentBadgeProps) {
  if (!isNonProductionAppHost()) return null;

  const prodUrl = getConfiguredProdAppUrl();
  if (!prodUrl) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={prodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-flex shrink-0", className)}
            aria-label="UAT environment. Open production app in a new tab."
          >
            <Badge
              variant="outline"
              className="gap-1 border-violet-400/70 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-800 uppercase hover:bg-violet-500/15 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-100"
            >
              <FlaskConical className="h-3 w-3" aria-hidden />
              UAT
            </Badge>
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          <p className="font-medium">Not the production application</p>
          <p className="text-muted-foreground mt-1 text-xs">
            You are on a UAT or non-production host. Data here may differ from
            production.
          </p>
          <span className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium">
            Open production
            <ExternalLink className="h-3 w-3" aria-hidden />
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
