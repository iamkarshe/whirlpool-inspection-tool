import type { ReleaseFeatureResponseType } from "@/api/generated/model/releaseFeatureResponseType";
import { BADGE_ICON_CLASS, Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatLatestHashLabel } from "@/pages/dashboard/release-notes/release-notes-utils";
import { Hammer, Sparkles, TrendingUp, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURE_TYPE_CONFIG: Record<
  NonNullable<ReleaseFeatureResponseType>,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "success" | "info";
    icon: LucideIcon;
  }
> = {
  feature: { label: "Feature", variant: "default", icon: Sparkles },
  fix: { label: "Fix", variant: "success", icon: Wrench },
  improvement: { label: "Improvement", variant: "info", icon: TrendingUp },
  chore: { label: "Chore", variant: "secondary", icon: Hammer },
};

export function ReleaseLatestHashBadge({
  hash,
  label,
  className,
  onClick,
}: {
  hash: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}) {
  const text =
    label ??
    (hash === "latest" ? "Latest change" : formatLatestHashLabel(hash));

  const badge = (
    <Badge
      variant="info"
      className={cn(
        BADGE_ICON_CLASS,
        onClick && "cursor-pointer hover:opacity-90",
        className,
      )}
    >
      <Sparkles aria-hidden />
      {text}
    </Badge>
  );

  if (!onClick) return badge;

  return (
    <button
      type="button"
      onClick={onClick}
      title="View latest change"
      className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
    >
      {badge}
    </button>
  );
}

export function ReleaseVersionBadge({
  version,
  isLatest = false,
  latestHash,
  onLatestClick,
}: {
  version: string;
  isLatest?: boolean;
  latestHash?: string | null;
  onLatestClick?: () => void;
}) {
  const hash = latestHash?.trim();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="font-medium">
        {version}
      </Badge>
      {isLatest && hash ? (
        <ReleaseLatestHashBadge hash={hash} onClick={onLatestClick} />
      ) : isLatest ? (
        <Badge variant="info" className={BADGE_ICON_CLASS}>
          <Sparkles aria-hidden />
          Latest
        </Badge>
      ) : null}
    </div>
  );
}

export function ReleaseFeatureTypeBadge({
  type,
  className,
  compact = false,
}: {
  type?: ReleaseFeatureResponseType;
  className?: string;
  compact?: boolean;
}) {
  if (!type) return null;

  const config = FEATURE_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        compact
          ? "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase [&>svg]:size-3"
          : BADGE_ICON_CLASS,
        "shrink-0",
        className,
      )}
    >
      <Icon aria-hidden />
      {config.label}
    </Badge>
  );
}

export function ReleaseFeatureSummaryBadges({
  counts,
}: {
  counts: Partial<Record<NonNullable<ReleaseFeatureResponseType>, number>>;
}) {
  const entries = (
    Object.entries(counts) as [NonNullable<ReleaseFeatureResponseType>, number][]
  ).filter(([, count]) => count > 0);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([type, count]) => {
        const config = FEATURE_TYPE_CONFIG[type];
        const Icon = config.icon;
        return (
          <Badge
            key={type}
            variant="outline"
            className="gap-1 px-2 py-0.5 text-[10px] font-medium uppercase"
          >
            <Icon className="size-3" aria-hidden />
            {count} {config.label}
            {count === 1 ? "" : "s"}
          </Badge>
        );
      })}
    </div>
  );
}
