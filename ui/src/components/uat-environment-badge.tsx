import { ExternalLink, FlaskConical } from "lucide-react";

import { StatusBadgeDialog } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  getConfiguredProdAppUrl,
  isNonProductionAppHost,
} from "@/lib/app-environment";

export type UatEnvironmentBadgeProps = {
  className?: string;
};

export function UatEnvironmentBadge({ className }: UatEnvironmentBadgeProps) {
  if (!isNonProductionAppHost()) return null;

  const prodUrl = getConfiguredProdAppUrl();
  if (!prodUrl) return null;

  return (
    <StatusBadgeDialog
      tone="violet"
      icon={FlaskConical}
      label="UAT"
      title="Not the production application"
      description="You are on a UAT or non-production host. Data and behavior here may differ from production."
      descriptionText="You are on a UAT or non-production host. Data and behavior here may differ from production."
      className={className}
      aria-label="UAT environment details"
      actions={
        <Button variant="outline" size="sm" className="h-8 w-full text-xs" asChild>
          <a href={prodUrl} target="_blank" rel="noopener noreferrer">
            Open production
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
      }
    />
  );
}
