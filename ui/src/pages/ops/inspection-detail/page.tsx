import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileX2,
  Image as ImageIcon,
  ImageOff,
  Flag,
  Link2,
  ListChecks,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";
import { useSessionUser } from "@/hooks/use-session-user";
import { canOpsRoleStartNewInspection, isOpsManagerRole } from "@/lib/ops-role";

import type {
  IssueSeverity,
  IssueType,
  RaiseIssuePayload,
  RaiseIssueTarget,
} from "@/components/dialogs/raise-issue-dialog";
import { RaiseIssueDialog } from "@/components/dialogs/raise-issue-dialog";
import {
  ImageGalleryDialog,
  type GalleryImage,
} from "@/components/image-gallery-dialog";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PAGES } from "@/endpoints";
import { formatDate, setPageTitle } from "@/lib/core";
import { cn } from "@/lib/utils";
import {
  formatIssueSeverity,
  formatIssueStatus,
  issueSeverityBadgeClass,
} from "@/pages/dashboard/inspections/components/view-tabs/inspection-issue-presenters";
import type { InspectionType } from "@/pages/dashboard/inspections/inspection-types";
import {
  getInspectionById,
  getInspectionQuestionResults,
  getInspectionRelationship,
  type Inspection,
  type InspectionQuestionResult,
  type InspectionRelationship,
} from "@/pages/dashboard/inspections/inspection-service";
import {
  deriveIsUnderReviewFromReviewStatus,
  inspectionsApiErrorMessage,
  patchInspectionReviewStatus,
} from "@/services/inspections-api";

const SECTION_ITEMS = [
  { key: "outer-packaging", label: "Outer Packaging" },
  { key: "inner-packaging", label: "Inner Packaging" },
  { key: "product", label: "Product" },
] as const;

type SectionKey = (typeof SECTION_ITEMS)[number]["key"];
type DetailTab = "overview" | "checks" | "images" | "issues" | "relationship";

type ManualIssue = {
  id: string;
  source: "system" | "manual";
  targetType: "inspection" | "image";
  title: string;
  description: string;
  severity: IssueSeverity;
  type: IssueType;
  section?: SectionKey;
  imageUrl?: string;
  imageFilename?: string;
  createdAt: string;
};

type OpsIssueRow = ManualIssue & { status: "open" | "resolved" };

type FlatImage = {
  key: string;
  url: string;
  filename?: string;
  section: SectionKey;
  question: string;
};

function getCounts(rows: InspectionQuestionResult[]) {
  const total = rows.length;
  const passed = rows.filter((r) => r.status === "pass").length;
  const failed = total - passed;
  return { total, passed, failed };
}

function opsInspectionKindLabel(type: InspectionType): string {
  return type === "outbound" ? "Outbound Inspection" : "Inbound Inspection";
}

function opsReviewStatusLabel(statusRaw: string | undefined): string {
  const s = (statusRaw ?? "").trim().toUpperCase();
  switch (s) {
    case InspectionReviewStatus.IN_REVIEW:
      return "In review";
    case InspectionReviewStatus.PENDING:
      return "Pending";
    case InspectionReviewStatus.APPROVED:
      return "Approved";
    case InspectionReviewStatus.REJECTED:
      return "Rejected";
    default:
      if (!s) return "";
      return s
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function OpsReviewStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").trim().toUpperCase();
  const label = opsReviewStatusLabel(status);
  const base = "shrink-0 text-[11px] font-medium";
  if (!label) {
    return (
      <Badge
        variant="outline"
        className={cn(base, "font-normal text-muted-foreground")}
      >
        —
      </Badge>
    );
  }
  if (s === InspectionReviewStatus.APPROVED) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        )}
      >
        {label}
      </Badge>
    );
  }
  if (s === InspectionReviewStatus.REJECTED) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-destructive/45 bg-destructive/10 text-destructive",
        )}
      >
        {label}
      </Badge>
    );
  }
  if (
    s === InspectionReviewStatus.IN_REVIEW ||
    s === InspectionReviewStatus.PENDING
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100",
        )}
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn(base, "font-normal")}>
      {label}
    </Badge>
  );
}

function StatusPill({ status }: { status: "pass" | "fail" }) {
  return status === "pass" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300">
      <XCircle className="h-3.5 w-3.5" />
      Fail
    </span>
  );
}

export default function OpsInspectionDetailPage() {
  const { id = "" } = useParams();
  const sessionUser = useSessionUser();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [relationship, setRelationship] =
    useState<InspectionRelationship | null>(null);
  const [sectionRows, setSectionRows] = useState<
    Record<SectionKey, InspectionQuestionResult[]>
  >({
    "outer-packaging": [],
    "inner-packaging": [],
    product: [],
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);
  const [raiseIssueOpen, setRaiseIssueOpen] = useState(false);
  const [manualIssues, setManualIssues] = useState<ManualIssue[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<
    Record<string, { resolvedAt: string; remark: string }>
  >({});
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolveRemark, setResolveRemark] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    getInspectionById(id)
      .then((result) => {
        if (!cancelled) setInspection(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (loading) return;
    setPageTitle("Inspection");
  }, [loading, inspection]);

  useEffect(() => {
    let cancelled = false;
    getInspectionRelationship(id).then((result) => {
      if (!cancelled) setRelationship(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setReviewLoading(true));
    Promise.all([
      getInspectionQuestionResults(id, "outer-packaging"),
      getInspectionQuestionResults(id, "inner-packaging"),
      getInspectionQuestionResults(id, "product"),
    ])
      .then(([outer, inner, product]) => {
        if (cancelled) return;
        setSectionRows({
          "outer-packaging": outer,
          "inner-packaging": inner,
          product,
        });
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const summary = useMemo(() => {
    const allRows = [
      ...sectionRows["outer-packaging"],
      ...sectionRows["inner-packaging"],
      ...sectionRows.product,
    ];
    return getCounts(allRows);
  }, [sectionRows]);

  const allImages = useMemo<FlatImage[]>(() => {
    const source = [
      ...sectionRows["outer-packaging"],
      ...sectionRows["inner-packaging"],
      ...sectionRows.product,
    ];
    return source.flatMap((row, index) =>
      row.images.map((img) => ({
        key: `${row.id}-${index}-${img.url}`,
        url: img.url,
        filename: img.filename,
        section: row.section as SectionKey,
        question: row.question,
      })),
    );
  }, [sectionRows]);

  const systemIssues = useMemo<ManualIssue[]>(() => {
    const source = [
      ...sectionRows["outer-packaging"],
      ...sectionRows["inner-packaging"],
      ...sectionRows.product,
    ];
    return source
      .filter((r) => r.status === "fail")
      .map((r) => ({
        id: `sys-${id}-${r.id}`,
        source: "system" as const,
        targetType:
          r.images.length > 0 ? ("image" as const) : ("inspection" as const),
        title: r.question,
        description:
          r.notes ?? `Failed check in ${r.section.replace("-", " ")}.`,
        severity: "medium" as const,
        type: "other" as const,
        section: r.section as SectionKey,
        imageUrl: r.images[0]?.url,
        imageFilename: r.images[0]?.filename,
        createdAt: inspection?.created_at ?? new Date().toISOString(),
      }));
  }, [id, inspection?.created_at, sectionRows]);

  const issueRows = useMemo<OpsIssueRow[]>(() => {
    return [...manualIssues, ...systemIssues].map((issue) => ({
      ...issue,
      status: resolvedIssues[issue.id] ? "resolved" : "open",
    }));
  }, [manualIssues, systemIssues, resolvedIssues]);

  const raiseIssueTarget: RaiseIssueTarget = activeGalleryUrl
    ? {
        type: "image",
        inspectionId: id,
        imageUrl: activeGalleryUrl,
        imageFilename: galleryImages.find((img) => img.url === activeGalleryUrl)
          ?.filename,
      }
    : {
        type: "inspection",
        inspectionId: id,
      };

  const resolvingIssue = useMemo(
    () => issueRows.find((issue) => issue.id === resolvingIssueId) ?? null,
    [issueRows, resolvingIssueId],
  );

  const isManager = isOpsManagerRole(sessionUser?.role);
  const canSubmitManagerReview = useMemo(
    () =>
      Boolean(
        inspection &&
        isManager &&
        (inspection.is_under_review ||
          deriveIsUnderReviewFromReviewStatus(inspection.review_status ?? "")),
      ),
    [inspection, isManager],
  );

  const submitManagerReview = useCallback(
    async (
      status: (typeof InspectionReviewStatus)[keyof typeof InspectionReviewStatus],
    ) => {
      if (!inspection?.id) return;
      setReviewSubmitting(true);
      try {
        await patchInspectionReviewStatus(inspection.id, {
          review_status: status,
          comment: reviewComment.trim() || null,
        });
        toast.success(
          status === InspectionReviewStatus.APPROVED
            ? "Inspection approved."
            : "Inspection rejected.",
        );
        const next = await getInspectionById(inspection.id);
        setInspection(next);
        setReviewComment("");
      } catch (err: unknown) {
        toast.error(
          inspectionsApiErrorMessage(err, "Could not update review status."),
        );
      } finally {
        setReviewSubmitting(false);
      }
    },
    [inspection, reviewComment],
  );

  function openRowImages(row: InspectionQuestionResult) {
    const images = row.images.map((img) => ({
      url: img.url,
      filename: img.filename,
    }));
    setGalleryImages(images);
    setActiveGalleryUrl(images[0]?.url ?? null);
    setGalleryOpen(true);
  }

  function resolveIssue(issueId: string) {
    setResolvingIssueId(issueId);
    setResolveRemark("");
    setResolveOpen(true);
  }

  if (loading) {
    return <OpsInspectionSkeleton variant="detail" />;
  }

  if (!inspection) {
    return (
      <div className="flex min-h-[min(52dvh,20rem)] flex-col justify-center py-4">
        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-sm">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
            <OpsListEmptyState
              icon={FileX2}
              title="Inspection not found"
              description="This link may be incorrect, the inspection may have been removed, or you might not have permission to view it."
            />
            <Button className="h-11 w-full gap-2 text-sm font-medium" asChild>
              <Link to={PAGES.OPS_TODAY_INSPECTIONS}>
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                {"Today's inspections"}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        title="Inspection images"
        description="Tap thumbnail to preview. You can raise an issue from this view."
        images={galleryImages}
        activeUrl={activeGalleryUrl}
        onActiveUrlChange={(url) => setActiveGalleryUrl(url)}
        onRaiseIssue={(img) => {
          setActiveGalleryUrl(img.url);
          setRaiseIssueOpen(true);
        }}
      />

      <RaiseIssueDialog
        open={raiseIssueOpen}
        onOpenChange={setRaiseIssueOpen}
        target={raiseIssueTarget}
        onSubmit={(payload: RaiseIssuePayload) => {
          const next: ManualIssue = {
            id: `manual-${crypto.randomUUID()}`,
            source: "manual",
            targetType: payload.target.type,
            title: payload.title,
            description: payload.description,
            severity: payload.severity,
            type: payload.type,
            createdAt: new Date().toISOString(),
            imageUrl:
              payload.target.type === "image"
                ? payload.target.imageUrl
                : undefined,
            imageFilename:
              payload.target.type === "image"
                ? payload.target.imageFilename
                : undefined,
          };
          setManualIssues((prev) => [next, ...prev]);
          setTab("issues");
        }}
      />

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">Resolve issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/20 p-2 text-xs">
              <p className="font-medium">{resolvingIssue?.title ?? "Issue"}</p>
              <p className="text-muted-foreground mt-1">
                Add a short resolution note.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="resolve-remark" className="text-xs">
                Remark
              </Label>
              <Textarea
                id="resolve-remark"
                value={resolveRemark}
                onChange={(event) => setResolveRemark(event.target.value)}
                rows={3}
                className="text-xs"
                placeholder="What was done?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResolveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={resolveRemark.trim().length === 0 || !resolvingIssue}
              onClick={() => {
                if (!resolvingIssue) return;
                setResolvedIssues((prev) => ({
                  ...prev,
                  [resolvingIssue.id]: {
                    resolvedAt: new Date().toISOString(),
                    remark: resolveRemark.trim(),
                  },
                }));
                setResolveOpen(false);
              }}
            >
              Mark resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to={PAGES.OPS_TODAY_INSPECTIONS} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Inspection
          </p>
          <h1 className="text-balance text-lg font-semibold leading-snug tracking-tight">
            {opsInspectionKindLabel(inspection.inspection_type)}
          </h1>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
            {inspection.id}
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal">
            {formatDate(inspection.created_at)}
          </Badge>
          <OpsReviewStatusBadge status={inspection.review_status} />
        </div>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Product</span>
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            <span className="font-medium text-foreground">
              {inspection.product_serial}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Inspector</span>
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            <span className="font-medium text-foreground">
              {inspection.inspector_name}
            </span>
          </p>
        </div>
      </section>

      <section className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        {reviewLoading ? (
          <p className="text-sm text-muted-foreground">Loading summary...</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">Checks</p>
              <p className="text-sm font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-2">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Passed
              </p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                {summary.passed}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-2">
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Failed
              </p>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">
                {summary.failed}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-3xl border border-violet-500/20 bg-violet-500/5 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-900 dark:text-violet-100">
          Quality review
        </h2>
        {canSubmitManagerReview ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] text-muted-foreground">
                Current status
              </span>
              <OpsReviewStatusBadge status={inspection.review_status} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Manager decision — this inspection is waiting in Inspection Review.
            </p>
            <div className="space-y-1">
              <Label htmlFor="mgr-review-comment" className="text-xs">
                Comment (optional)
              </Label>
              <Textarea
                id="mgr-review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                className="text-xs"
                placeholder="Note for the record…"
                disabled={reviewSubmitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                className="h-10"
                disabled={reviewSubmitting}
                onClick={() =>
                  void submitManagerReview(InspectionReviewStatus.APPROVED)
                }
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-10"
                disabled={reviewSubmitting}
                onClick={() =>
                  void submitManagerReview(InspectionReviewStatus.REJECTED)
                }
              >
                Reject
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="text-muted-foreground">Review status</span>
              <OpsReviewStatusBadge status={inspection.review_status} />
            </p>
            <p>
              {isManager
                ? "No manager action is required right now."
                : "Only managers can approve or reject inspections from the Ops app."}
            </p>
          </div>
        )}
      </section>

      <Tabs value={tab} onValueChange={(value) => setTab(value as DetailTab)}>
        <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-muted/60 p-1">
          <TabsTrigger value="overview" className="text-[11px]">
            Overview
          </TabsTrigger>
          <TabsTrigger value="checks" className="text-[11px]">
            Checks
          </TabsTrigger>
          <TabsTrigger value="images" className="text-[11px]">
            Images
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-[11px]">
            Issues
          </TabsTrigger>
          <TabsTrigger value="relationship" className="text-[11px]">
            Related
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <section className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => {
                  setGalleryImages(
                    allImages.map((img) => ({
                      url: img.url,
                      filename: img.filename,
                    })),
                  );
                  setActiveGalleryUrl(allImages[0]?.url ?? null);
                  setGalleryOpen(true);
                }}
              >
                <ImageIcon className="mr-1 h-3.5 w-3.5" />
                View images
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => {
                  setActiveGalleryUrl(null);
                  setRaiseIssueOpen(true);
                }}
              >
                <Flag className="mr-1 h-3.5 w-3.5" />
                Raise issue
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="checks" className="mt-3 space-y-3">
          {SECTION_ITEMS.map((section) => {
            const rows = sectionRows[section.key];
            const counts = getCounts(rows);
            return (
              <section
                key={section.key}
                className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {section.label}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {counts.passed}/{counts.total} pass
                  </p>
                </div>
                <div className="space-y-2">
                  {rows.length === 0 ? (
                    <OpsListEmptyState
                      variant="compact"
                      icon={ListChecks}
                      title="No results in this section"
                      description="Answers for this part of the checklist will show here once recorded."
                    />
                  ) : (
                    rows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border bg-muted/20 p-2.5"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="text-xs leading-snug">{row.question}</p>
                          <StatusPill status={row.status} />
                        </div>
                        {row.notes ? (
                          <p className="text-[11px] text-muted-foreground">
                            {row.notes}
                          </p>
                        ) : null}
                        {row.images.length > 0 ? (
                          <div className="mt-2 flex gap-2 overflow-x-auto">
                            {row.images.map((img) => (
                              <button
                                key={`${row.id}-${img.url}`}
                                type="button"
                                className="shrink-0"
                                onClick={() => openRowImages(row)}
                              >
                                <img
                                  src={img.url}
                                  alt={img.filename ?? row.question}
                                  className="h-14 w-14 rounded-lg border object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="images" className="mt-3 space-y-3">
          <section className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Captured Images
              </h2>
              <Badge variant="outline" className="text-[10px]">
                {allImages.length}
              </Badge>
            </div>
            {allImages.length === 0 ? (
              <OpsListEmptyState
                variant="compact"
                icon={ImageOff}
                title="No images captured"
                description="Photos attached to checklist answers will appear in this gallery."
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {allImages.map((img) => {
                  const imageIssueCount = issueRows.filter(
                    (i) => i.imageUrl === img.url,
                  ).length;
                  return (
                    <button
                      key={img.key}
                      type="button"
                      className="relative overflow-hidden rounded-xl border bg-muted/20"
                      onClick={() => {
                        setGalleryImages(
                          allImages.map((i) => ({
                            url: i.url,
                            filename: i.filename,
                          })),
                        );
                        setActiveGalleryUrl(img.url);
                        setGalleryOpen(true);
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.filename ?? img.question}
                        className="h-24 w-full object-cover"
                      />
                      {imageIssueCount > 0 ? (
                        <span className="absolute top-1 right-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                          {imageIssueCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="issues" className="mt-3 space-y-3">
          <section className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Issue Tracker
              </h2>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setActiveGalleryUrl(null);
                  setRaiseIssueOpen(true);
                }}
              >
                Raise
              </Button>
            </div>
            {issueRows.length === 0 ? (
              <OpsListEmptyState
                variant="compact"
                icon={Flag}
                title="No issues reported"
                description="Raise an issue from this inspection when something needs follow-up."
              />
            ) : (
              <div className="space-y-2">
                {issueRows.map((issue) => (
                  <div
                    key={issue.id}
                    className="space-y-1 rounded-2xl border bg-muted/20 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug">
                        {issue.title}
                      </p>
                      <Badge
                        variant={
                          issue.status === "resolved"
                            ? "success"
                            : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {formatIssueStatus(issue.status)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {issue.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${issueSeverityBadgeClass(issue.severity)}`}
                      >
                        {formatIssueSeverity(issue.severity)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        {issue.type.replaceAll("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {formatDate(issue.createdAt)}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5 pt-0.5">
                      {issue.imageUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => {
                            setGalleryImages([
                              {
                                url: issue.imageUrl ?? "",
                                filename: issue.imageFilename,
                              },
                            ]);
                            setActiveGalleryUrl(issue.imageUrl ?? null);
                            setGalleryOpen(true);
                          }}
                        >
                          <ImageIcon className="mr-1 h-3 w-3" />
                          Image
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant={
                          issue.status === "resolved" ? "secondary" : "outline"
                        }
                        className="h-7 px-2 text-[11px]"
                        disabled={issue.status === "resolved"}
                        onClick={() => resolveIssue(issue.id)}
                      >
                        <Link2 className="mr-1 h-3 w-3" />
                        {issue.status === "resolved" ? "Resolved" : "Resolve"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="relationship" className="mt-3">
          <section className="space-y-2 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Relationship
            </h2>
            {relationship ? (
              <div className="space-y-2 text-[11px]">
                <div className="rounded-2xl border bg-muted/20 p-2.5">
                  <p className="font-medium">Inbound scan</p>
                  <p className="text-muted-foreground">
                    {relationship.inbound.personName}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(relationship.inbound.scannedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-2.5">
                  <p className="font-medium">Outbound scan</p>
                  {relationship.outbound ? (
                    <>
                      <p className="text-muted-foreground">
                        {relationship.outbound.personName}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(relationship.outbound.scannedAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Not available</p>
                  )}
                </div>
              </div>
            ) : (
              <OpsListEmptyState
                variant="compact"
                icon={Link2}
                title="No relationship data"
                description="Linked inbound and outbound scans will appear here when the system has them."
              />
            )}
          </section>
        </TabsContent>
      </Tabs>

      {canOpsRoleStartNewInspection(sessionUser?.role) ? (
        <Button className="w-full" variant="outline" asChild>
          <Link to={PAGES.OPS_NEW_INSPECTION}>
            <Camera className="mr-2 h-4 w-4" />
            Start new inspection
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
