import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle, Globe, Info, XCircle } from "lucide-react";

const TECH_BADGE_CLASS = "font-mono text-xs font-normal";

export function LoginIdBadge({ id }: { id: string }) {
  return (
    <Badge variant="outline" className={cn(TECH_BADGE_CLASS, "max-w-full truncate")}>
      {id}
    </Badge>
  );
}

export function LoginIpBadge({ ip }: { ip: string }) {
  return (
    <Badge variant="outline" className={TECH_BADGE_CLASS}>
      <Globe className="mr-1 h-3 w-3 shrink-0 opacity-70" />
      {ip}
    </Badge>
  );
}

export function LoginStatusBadge({ success }: { success: boolean }) {
  const Icon = success ? CheckCircle : XCircle;
  return (
    <Badge
      variant={success ? "default" : "destructive"}
      className={BADGE_ICON_CLASS}
    >
      <Icon />
      {success ? "SUCCESS" : "FAILED"}
    </Badge>
  );
}

export function LoginNaBadge({
  tooltip,
  label = "N/A",
}: {
  tooltip: string;
  label?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`${BADGE_ICON_CLASS} cursor-help`}
          >
            <Info />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
