import PageActionBar from "@/components/page-action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getReleaseNotes,
  type ReleaseFeature,
  type ReleaseFeatureType,
  type ReleaseNote,
} from "@/pages/dashboard/release-notes/release-notes-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

const featureTypeVariant: Record<
  ReleaseFeatureType,
  "default" | "secondary" | "outline" | "success"
> = {
  feature: "default",
  fix: "secondary",
  improvement: "outline",
  chore: "secondary",
};

const featureTypeLabel: Record<ReleaseFeatureType, string> = {
  feature: "Feature",
  fix: "Fix",
  improvement: "Improvement",
  chore: "Chore",
};

function ReleaseVersionBadge({ version }: { version: string }) {
  return (
    <Badge variant="secondary" className="font-mono font-medium">
      {version}
    </Badge>
  );
}

function FeatureTypePill({ type }: { type: ReleaseFeatureType }) {
  return (
    <Badge
      variant={featureTypeVariant[type]}
      className="min-w-[5.5rem] justify-center text-[10px] uppercase tracking-wide"
    >
      {featureTypeLabel[type]}
    </Badge>
  );
}

function buildColumns(
  onView: (release: ReleaseNote) => void,
): ColumnDef<ReleaseNote>[] {
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
      cell: ({ row }) => <ReleaseVersionBadge version={row.original.version} />,
    },
    {
      accessorKey: "releasedAt",
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
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.releasedAt}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "features",
      header: "Items",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.features.length} items
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => onView(row.original)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ];
}

function ReleaseDetailDialog({
  release,
  open,
  onOpenChange,
}: {
  release: ReleaseNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!release) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl">{release.title}</DialogTitle>
            <ReleaseVersionBadge version={release.version} />
          </div>
          <p className="text-muted-foreground text-sm font-normal">
            Released {release.releasedAt}
          </p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            What&apos;s included
          </h4>
          <ul className="space-y-2">
            {release.features.map((item: ReleaseFeature, i: number) => (
              <li
                key={`${release.id}-${i}`}
                className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                {item.type ? (
                  <FeatureTypePill type={item.type} />
                ) : (
                  <span className="text-muted-foreground min-w-[5.5rem] text-center">
                    •
                  </span>
                )}
                <span className="min-w-0 flex-1">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReleaseNotesPage() {
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseNote | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReleaseNotes().then((data) => {
      setReleases(data);
      setLoading(false);
    });
  }, []);

  const handleView = (release: ReleaseNote) => {
    setSelectedRelease(release);
    setDialogOpen(true);
  };

  const columns = buildColumns(handleView);

  return (
    <div className="space-y-4">
      <PageActionBar
        title="Release Notes"
        description="Track changes and improvements shipped to the application."
      />

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <DataTable<ReleaseNote>
          columns={columns}
          data={releases}
          searchKey="title"
        />
      )}

      <ReleaseDetailDialog
        release={selectedRelease}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
