import type { ReleaseFeatureResponse } from "@/api/generated/model/releaseFeatureResponse";
import type { ReleaseFeatureResponseType } from "@/api/generated/model/releaseFeatureResponseType";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  countFeatureTypes,
  formatReleaseDate,
} from "@/pages/dashboard/release-notes/release-notes-utils";
import {
  ReleaseFeatureSummaryBadges,
  ReleaseFeatureTypeBadge,
  ReleaseVersionBadge,
} from "@/pages/dashboard/release-notes/release-badges";
import type { ReleaseNoteRow } from "@/services/release-notes-api";
import { GitCommit } from "lucide-react";

const FEATURE_SECTIONS: {
  type: NonNullable<ReleaseFeatureResponseType>;
  title: string;
}[] = [
  { type: "feature", title: "New features" },
  { type: "improvement", title: "Improvements" },
  { type: "fix", title: "Fixes" },
  { type: "chore", title: "Maintenance" },
];

function groupFeaturesByType(features: ReleaseFeatureResponse[]) {
  const grouped = new Map<
    NonNullable<ReleaseFeatureResponseType>,
    ReleaseFeatureResponse[]
  >();
  const untyped: ReleaseFeatureResponse[] = [];

  for (const feature of features) {
    if (feature.type) {
      const existing = grouped.get(feature.type) ?? [];
      existing.push(feature);
      grouped.set(feature.type, existing);
    } else {
      untyped.push(feature);
    }
  }

  return { grouped, untyped };
}

function ReleaseFeatureRow({ feature }: { feature: ReleaseFeatureResponse }) {
  const hash = feature.hash?.trim();

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-[6.75rem_minmax(0,1fr)_4.5rem] sm:items-start sm:gap-4">
      <div className="sm:pt-0.5">
        {feature.type ? (
          <ReleaseFeatureTypeBadge type={feature.type} compact />
        ) : (
          <Badge variant="outline" className="text-[10px] uppercase">
            Change
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{feature.text}</p>
      <div className="sm:text-right">
        {hash ? (
          <Badge
            variant="outline"
            className="text-muted-foreground gap-1 px-1.5 py-0 font-mono text-[10px] font-normal"
            title={hash}
          >
            <GitCommit className="size-3 shrink-0" aria-hidden />
            {hash.slice(0, 7)}
          </Badge>
        ) : (
          <span className="text-muted-foreground hidden text-xs sm:inline">—</span>
        )}
      </div>
    </div>
  );
}

function ReleaseFeatureSection({
  title,
  features,
}: {
  title: string;
  features: ReleaseFeatureResponse[];
}) {
  if (features.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        <span className="text-muted-foreground text-xs">
          {features.length} item{features.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {features.map((feature, index) => (
          <ReleaseFeatureRow
            key={`${feature.hash ?? feature.text}-${index}`}
            feature={feature}
          />
        ))}
      </div>
    </section>
  );
}

export function ReleaseDetailDialog({
  release,
  isLatest,
  open,
  onOpenChange,
}: {
  release: ReleaseNoteRow | null;
  isLatest: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!release) return null;

  const features = release.features ?? [];
  const counts = countFeatureTypes(features);
  const { grouped, untyped } = groupFeaturesByType(features);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,880px)] w-[min(56rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-[min(56rem,calc(100vw-2rem))]",
        )}
      >
        <DialogHeader className="space-y-3 border-b bg-muted/30 px-6 py-5 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl leading-snug">
                {release.title}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Released {formatReleaseDate(release.released_at)}
              </DialogDescription>
            </div>
            <ReleaseVersionBadge version={release.version} isLatest={isLatest} />
          </div>
          {Object.keys(counts).length > 0 ? (
            <ReleaseFeatureSummaryBadges counts={counts} />
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {features.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No change details were recorded for this release.
            </p>
          ) : (
            <>
              {FEATURE_SECTIONS.map(({ type, title }) => (
                <ReleaseFeatureSection
                  key={type}
                  title={title}
                  features={grouped.get(type) ?? []}
                />
              ))}
              {untyped.length > 0 ? (
                <ReleaseFeatureSection title="Other changes" features={untyped} />
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
