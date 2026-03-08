import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, Info, XCircle } from "lucide-react";

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
