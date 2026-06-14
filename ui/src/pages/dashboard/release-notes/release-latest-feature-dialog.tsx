import type { ReleaseFeatureResponse } from "@/api/generated/model/releaseFeatureResponse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatReleaseDate } from "@/pages/dashboard/release-notes/release-notes-utils";
import {
  ReleaseFeatureTypeBadge,
  ReleaseLatestHashBadge,
} from "@/pages/dashboard/release-notes/release-badges";
import type { ReleaseNoteRow } from "@/services/release-notes-api";
import { GitCommit } from "lucide-react";

type ReleaseLatestFeatureDialogProps = {
  release: ReleaseNoteRow | null;
  feature: ReleaseFeatureResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewFullRelease?: () => void;
};

export function ReleaseLatestFeatureDialog({
  release,
  feature,
  open,
  onOpenChange,
  onViewFullRelease,
}: ReleaseLatestFeatureDialogProps) {
  if (!release || !feature) return null;

  const hash = feature.hash?.trim() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-3 border-b bg-muted/30 px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            {hash ? (
              <ReleaseLatestHashBadge hash={hash} />
            ) : (
              <ReleaseLatestHashBadge hash="latest" label="Latest change" />
            )}
            {feature.type ? (
              <ReleaseFeatureTypeBadge type={feature.type} compact />
            ) : null}
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-lg leading-snug">
              Latest change
            </DialogTitle>
            <DialogDescription className="text-sm">
              {release.title} · {release.version} ·{" "}
              {formatReleaseDate(release.released_at)}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-foreground">
            {feature.text}
          </p>
          {hash ? (
            <Badge
              variant="outline"
              className="text-muted-foreground gap-1.5 px-2 py-1 font-mono text-xs font-normal"
              title={hash}
            >
              <GitCommit className="size-3.5 shrink-0" aria-hidden />
              {hash.length > 7 ? hash.slice(0, 7) : hash}
            </Badge>
          ) : null}
        </div>

        {onViewFullRelease ? (
          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={onViewFullRelease}>
              View all changes in this release
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
