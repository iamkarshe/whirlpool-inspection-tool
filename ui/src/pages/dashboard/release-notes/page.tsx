import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ReleaseFeatureResponse } from "@/api/generated/model/releaseFeatureResponse";
import type { ReleaseNoteResponse } from "@/api/generated/model/releaseNoteResponse";
import { ReleaseDetailDialog } from "@/pages/dashboard/release-notes/release-detail-dialog";
import { ReleaseLatestFeatureDialog } from "@/pages/dashboard/release-notes/release-latest-feature-dialog";
import {
  countFeatureTypes,
  formatReleaseDate,
  getHeadFeature,
  getHeadFeatureHash,
} from "@/pages/dashboard/release-notes/release-notes-utils";
import {
  ReleaseFeatureSummaryBadges,
  ReleaseVersionBadge,
} from "@/pages/dashboard/release-notes/release-badges";
import {
  fetchReleaseNotes,
  releaseNotesApiErrorMessage,
  type ReleaseNoteRow,
} from "@/services/release-notes-api";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function buildColumns(
  latestReleaseId: string | null,
  onView: (release: ReleaseNoteRow) => void,
  onViewLatestChange: (release: ReleaseNoteRow) => void,
): ColumnDef<ReleaseNoteRow>[] {
  return [
    {
      accessorKey: "version",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Version
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isLatest = row.original.id === latestReleaseId;
        const headHash = isLatest ? getHeadFeatureHash(row.original) : null;

        return (
          <ReleaseVersionBadge
            version={row.original.version}
            isLatest={isLatest}
            latestHash={headHash}
            onLatestClick={
              isLatest && getHeadFeature(row.original)
                ? () => onViewLatestChange(row.original)
                : undefined
            }
          />
        );
      },
    },
    {
      accessorKey: "released_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Released
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatReleaseDate(row.original.released_at)}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const isLatest = row.original.id === latestReleaseId;
        const hasLatestChange = isLatest && getHeadFeature(row.original);

        if (hasLatestChange) {
          return (
            <button
              type="button"
              onClick={() => onViewLatestChange(row.original)}
              className="text-left font-medium hover:underline"
              title="View latest change"
            >
              {row.original.title}
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={() => onView(row.original)}
            className="text-left font-medium hover:underline"
          >
            {row.original.title}
          </button>
        );
      },
    },
    {
      id: "summary",
      header: "Changes",
      cell: ({ row }) => {
        const features = row.original.features ?? [];
        const counts = countFeatureTypes(features);
        const hasTyped = Object.keys(counts).length > 0;

        return (
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs">
              {features.length} item{features.length === 1 ? "" : "s"}
            </span>
            {hasTyped ? <ReleaseFeatureSummaryBadges counts={counts} /> : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onView(row.original)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      ),
    },
  ];
}

export default function ReleaseNotesPage() {
  const [releases, setReleases] = useState<ReleaseNoteRow[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseNoteRow | null>(
    null,
  );
  const [latestFeature, setLatestFeature] =
    useState<ReleaseFeatureResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [latestDialogOpen, setLatestDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchReleaseNotes()
      .then((data) => {
        if (!cancelled) {
          setReleases(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            releaseNotesApiErrorMessage(err, "Could not load release notes."),
          );
          setReleases([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestReleaseId = releases[0]?.id ?? null;
  const latestRelease = releases[0] ?? null;

  const handleView = useCallback((release: ReleaseNoteResponse) => {
    setSelectedRelease(release);
    setDetailDialogOpen(true);
  }, []);

  const handleViewLatestChange = useCallback((release: ReleaseNoteResponse) => {
    const feature = getHeadFeature(release);
    if (!feature) return;
    setSelectedRelease(release);
    setLatestFeature(feature);
    setLatestDialogOpen(true);
  }, []);

  const handleViewFullReleaseFromLatest = useCallback(() => {
    setLatestDialogOpen(false);
    if (selectedRelease) {
      setDetailDialogOpen(true);
    }
  }, [selectedRelease]);

  const columns = useMemo(
    () => buildColumns(latestReleaseId, handleView, handleViewLatestChange),
    [latestReleaseId, handleView, handleViewLatestChange],
  );

  return (
    <div className="space-y-4">
      <PageActionBar
        title="Release Notes"
        description="Track changes and improvements shipped to the application."
      />

      {error && !loading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <DataTable<ReleaseNoteRow>
        columns={columns}
        data={releases}
        searchKey="title"
        rangeLabel="release notes"
        isLoading={loading}
        showDateRangePicker={false}
      />

      {!loading && !error && releases.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No release notes have been published yet.
        </p>
      ) : null}

      <ReleaseLatestFeatureDialog
        release={selectedRelease ?? latestRelease}
        feature={latestFeature}
        open={latestDialogOpen}
        onOpenChange={setLatestDialogOpen}
        onViewFullRelease={handleViewFullReleaseFromLatest}
      />

      <ReleaseDetailDialog
        release={selectedRelease}
        isLatest={selectedRelease?.id === latestReleaseId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
