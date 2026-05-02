import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  ImageOff,
  Flag,
  Link2,
  ListChecks,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import {
  formatIssueSeverity,
  formatIssueStatus,
  issueSeverityBadgeClass,
} from "@/pages/dashboard/inspections/components/view-tabs/inspection-issue-presenters";
import { InspectionTypeBadge } from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionById,
  getInspectionQuestionResults,
  getInspectionRelationship,
  type Inspection,
  type InspectionQuestionResult,
  type InspectionRelationship,
} from "@/pages/dashboard/inspections/inspection-service";

const SECTION_ITEMS = [
  { key: "outer-packaging", label: "Outer Packaging" },
  { key: "inner-packaging", label: "Inner Packaging" },
  { key: "product", label: "Product" },
  { key: "device", label: "Device" },
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
    device: [],
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
    if (!inspection) return;
    setPageTitle(`Inspection ${inspection.id}`);
  }, [inspection]);

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
      getInspectionQuestionResults(id, "device"),
    ])
      .then(([outer, inner, product, device]) => {
        if (cancelled) return;
        setSectionRows({
          "outer-packaging": outer,
          "inner-packaging": inner,
          product,
          device,
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
      ...sectionRows.device,
    ];
    return getCounts(allRows);
  }, [sectionRows]);

  const allImages = useMemo<FlatImage[]>(() => {
    const source = [
      ...sectionRows["outer-packaging"],
      ...sectionRows["inner-packaging"],
      ...sectionRows.product,
      ...sectionRows.device,
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
        targetType: r.images.length > 0 ? ("image" as const) : ("inspection" as const),
        title: r.question,
        description: r.notes ?? `Failed check in ${r.section.replace("-", " ")}.`,
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

  function openRowImages(row: InspectionQuestionResult) {
    const images = row.images.map((img) => ({ url: img.url, filename: img.filename }));
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
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Inspection not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.OPS_TODAY_INSPECTIONS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to today inspections
          </Link>
        </Button>
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
              payload.target.type === "image" ? payload.target.imageUrl : undefined,
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
              <p className="text-muted-foreground mt-1">Add a short resolution note.</p>
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
            <Button variant="outline" size="sm" onClick={() => setResolveOpen(false)}>
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

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={PAGES.OPS_TODAY_INSPECTIONS} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Inspection detail
          </p>
          <h1 className="text-base font-semibold leading-tight">
            {inspection.id}
          </h1>
        </div>
      </div>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <InspectionTypeBadge inspectionType={inspection.inspection_type} />
          <Badge variant="outline">{formatDate(inspection.created_at)}</Badge>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Product:</span>{" "}
            <span className="font-medium">{inspection.product_serial}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Checklist:</span>{" "}
            <span className="font-medium">{inspection.checklist_name}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Inspector:</span>{" "}
            <span className="font-medium">{inspection.inspector_name}</span>
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
                  setGalleryImages(allImages.map((img) => ({ url: img.url, filename: img.filename })));
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
                  {rows.length === 0 ?
                    <OpsListEmptyState
                      variant="compact"
                      icon={ListChecks}
                      title="No results in this section"
                      description="Answers for this part of the checklist will show here once recorded."
                    />
                  : rows.map((row) => (
                      <div key={row.id} className="rounded-2xl border bg-muted/20 p-2.5">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="text-xs leading-snug">{row.question}</p>
                          <StatusPill status={row.status} />
                        </div>
                        {row.notes ?
                          <p className="text-[11px] text-muted-foreground">{row.notes}</p>
                        : null}
                        {row.images.length > 0 ?
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
                        : null}
                      </div>
                    ))
                  }
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
            {allImages.length === 0 ?
              <OpsListEmptyState
                variant="compact"
                icon={ImageOff}
                title="No images captured"
                description="Photos attached to checklist answers will appear in this gallery."
              />
            : (
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
                      {imageIssueCount > 0 ?
                        <span className="absolute top-1 right-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                          {imageIssueCount}
                        </span>
                      : null}
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
            {issueRows.length === 0 ?
              <OpsListEmptyState
                variant="compact"
                icon={Flag}
                title="No issues reported"
                description="Raise an issue from this inspection when something needs follow-up."
              />
            : (
              <div className="space-y-2">
                {issueRows.map((issue) => (
                  <div key={issue.id} className="space-y-1 rounded-2xl border bg-muted/20 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug">{issue.title}</p>
                      <Badge
                        variant={issue.status === "resolved" ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {formatIssueStatus(issue.status)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{issue.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${issueSeverityBadgeClass(issue.severity)}`}
                      >
                        {formatIssueSeverity(issue.severity)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
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
                              { url: issue.imageUrl ?? "", filename: issue.imageFilename },
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
                        variant={issue.status === "resolved" ? "secondary" : "outline"}
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
                  <p className="text-muted-foreground">{relationship.inbound.personName}</p>
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

      <Button className="w-full" variant="outline" asChild>
        <Link to={PAGES.OPS_NEW_INSPECTION}>
          <Camera className="mr-2 h-4 w-4" />
          Start new inspection
        </Link>
      </Button>
    </div>
  );
}
