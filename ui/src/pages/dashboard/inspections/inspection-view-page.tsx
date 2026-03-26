import { ArrowLeft, Bug, ClipboardCheck, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Package,
  Box,
  ShoppingBag,
  User,
  Smartphone,
  GitBranch,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import {
  ImageGalleryDialog,
  type GalleryImage,
} from "@/components/image-gallery-dialog";
import {
  RaiseIssueDialog,
  type IssueSeverity,
  type IssueType,
  type RaiseIssuePayload,
} from "@/components/dialogs/raise-issue-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { ChecksSummaryDialog } from "@/pages/dashboard/inspections/components/checks-summary-dialog";
import { InspectionQuestionResultsTable } from "@/pages/dashboard/inspections/components/inspection-question-results-table";
import { TabbedButtons } from "@/components/tabbed-nav";
import { TabbedSurface } from "@/components/tabbed-content";
import {
  InspectionChecklistBadge,
  InspectionProductBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionById,
  getInspectionRelationship,
  getInspectionQuestionResults,
  type Inspection,
  type InspectionRelationship,
  type InspectionQuestionResult,
  type InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";
import { formatDate } from "@/lib/core";

type InspectionIssueRow = {
  id: string;
  source: "system" | "manual";
  targetType: "inspection" | "image";
  title: string;
  description: string;
  severity: IssueSeverity;
  type: IssueType;
  section?: InspectionSectionKey;
  imageUrl?: string;
  imageFilename?: string;
  createdAt: string;
  status: "open" | "resolved";
  resolvedAt?: string;
  resolutionRemark?: string;
};

type ManualIssue = Omit<
  InspectionIssueRow,
  "status" | "resolvedAt" | "resolutionRemark"
>;

export default function InspectionViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const location = useLocation();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<Inspection | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionRows, setSectionRows] = useState<InspectionQuestionResult[]>(
    [],
  );

  const [reviewLoading, setReviewLoading] = useState(false);
  const [outerRows, setOuterRows] = useState<InspectionQuestionResult[]>([]);
  const [innerRows, setInnerRows] = useState<InspectionQuestionResult[]>([]);
  const [productRows, setProductRows] = useState<InspectionQuestionResult[]>(
    [],
  );
  const [deviceRows, setDeviceRows] = useState<InspectionQuestionResult[]>([]);
  const [relationship, setRelationship] =
    useState<InspectionRelationship | null>(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

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
  const [checksDialogOpen, setChecksDialogOpen] = useState(false);
  const [checksDialogMode, setChecksDialogMode] = useState<"failed" | "passed">(
    "failed",
  );

  const tab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const t = (params.get("tab") ?? "overview").toLowerCase();
    const allowed = new Set([
      "overview",
      "outer-packaging",
      "inner-packaging",
      "product",
      "relationship",
      "images",
      "flags",
    ]);
    return allowed.has(t) ? t : "overview";
  }, [location.search]);

  const sectionKey = useMemo((): InspectionSectionKey | null => {
    if (tab === "outer-packaging") return "outer-packaging";
    if (tab === "inner-packaging") return "inner-packaging";
    if (tab === "product") return "product";
    return null;
  }, [tab]);

  function setTab(next: string) {
    const params = new URLSearchParams(location.search);
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true },
    );
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    getInspectionById(id)
      .then((data) => {
        if (!cancelled) setInspection(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setRelationshipLoading(true));
    getInspectionRelationship(id)
      .then((data) => {
        if (!cancelled) setRelationship(data);
      })
      .finally(() => {
        if (!cancelled) setRelationshipLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!sectionKey) return;
    let cancelled = false;
    queueMicrotask(() => setSectionLoading(true));
    getInspectionQuestionResults(id, sectionKey)
      .then((rows) => {
        if (!cancelled) setSectionRows(rows);
      })
      .finally(() => {
        if (!cancelled) setSectionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, sectionKey]);

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
        setOuterRows(outer);
        setInnerRows(inner);
        setProductRows(product);
        setDeviceRows(device);
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function getCounts(rows: InspectionQuestionResult[]) {
    const total = rows.length;
    const passed = rows.filter((r) => r.status === "pass").length;
    const failed = total - passed;
    return { total, passed, failed };
  }

  const reviewSummary = useMemo(() => {
    const outer = getCounts(outerRows);
    const inner = getCounts(innerRows);
    const product = getCounts(productRows);
    const total = outer.total + inner.total + product.total;
    const passed = outer.passed + inner.passed + product.passed;
    const failed = outer.failed + inner.failed + product.failed;
    return { total, passed, failed, outer, inner, product };
  }, [outerRows, innerRows, productRows]);

  const reviewKpis = useMemo((): KpiCardProps[] => {
    const pct =
      reviewSummary.total > 0
        ? `${Math.round((reviewSummary.passed / reviewSummary.total) * 100)}%`
        : "—";
    return [
      {
        label: "Passed checks",
        value: `${reviewSummary.passed}/${reviewSummary.total}`,
        icon: CheckCircle,
        className:
          "border-green-200 bg-green-50/30 hover:bg-green-50/50 dark:bg-green-900/10",
        onClick: () => {
          setChecksDialogMode("passed");
          setChecksDialogOpen(true);
        },
      },
      {
        label: "Failed checks",
        value: reviewSummary.failed,
        icon: XCircle,
        className:
          "border-red-200 bg-red-50/30 hover:bg-red-50/50 dark:bg-red-900/10",
        onClick: () => {
          setChecksDialogMode("failed");
          setChecksDialogOpen(true);
        },
      },
      {
        label: "Outer packaging",
        value: `${reviewSummary.outer.passed}/${reviewSummary.outer.total}`,
        icon: Package,
      },
      {
        label: "Inner packaging",
        value: `${reviewSummary.inner.passed}/${reviewSummary.inner.total}`,
        icon: Box,
      },
      {
        label: "Product",
        value: `${reviewSummary.product.passed}/${reviewSummary.product.total}`,
        icon: ShoppingBag,
      },
      {
        label: "Pass rate",
        value: pct,
        icon: CheckCircle,
      },
    ];
  }, [reviewSummary]);

  const checksBySection = useMemo(
    () => ({ outer: outerRows, inner: innerRows, product: productRows }),
    [innerRows, outerRows, productRows],
  );

  const allImages = useMemo(() => {
    const source = [...outerRows, ...innerRows, ...productRows, ...deviceRows];
    return source.flatMap((row) =>
      row.images.map((img, index) => ({
        ...img,
        section: row.section,
        question: row.question,
        key: `${row.id}-${index}-${img.url}`,
      })),
    );
  }, [outerRows, innerRows, productRows, deviceRows]);

  const allGalleryImages = useMemo(
    () => allImages.map(({ url, filename }) => ({ url, filename })),
    [allImages],
  );

  const systemIssues = useMemo<ManualIssue[]>(() => {
    return [...outerRows, ...innerRows, ...productRows]
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
        section: r.section,
        imageUrl: r.images[0]?.url,
        imageFilename: r.images[0]?.filename,
        createdAt: inspection?.created_at ?? new Date().toISOString(),
      }));
  }, [outerRows, innerRows, productRows, id, inspection?.created_at]);

  const issueRows = useMemo<InspectionIssueRow[]>(() => {
    return [...manualIssues, ...systemIssues].map((item) => {
      const resolved = resolvedIssues[item.id];
      return {
        ...item,
        status: resolved ? "resolved" : "open",
        resolvedAt: resolved?.resolvedAt,
        resolutionRemark: resolved?.remark,
      };
    });
  }, [manualIssues, systemIssues, resolvedIssues]);

  const issuesFilters: DataTableFilter<InspectionIssueRow>[] = [
    {
      id: "status",
      title: "Status",
      options: [
        { value: "open", label: "Open" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    {
      id: "severity",
      title: "Severity",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
  ];

  const issueColumns: ColumnDef<InspectionIssueRow>[] = [
    {
      accessorKey: "title",
      header: "Issue",
      cell: ({ row }) => (
        <div className="min-w-[220px]">
          <div className="font-medium">{row.original.title}</div>
          <div className="text-muted-foreground line-clamp-2 text-xs">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) =>
        row.original.section ? (
          <Badge variant="outline" className="capitalize">
            {row.original.section.replace("-", " ")}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.type.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.severity === "high"
              ? "border-red-300 bg-red-50 text-red-700"
              : row.original.severity === "medium"
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
          }
        >
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "resolved" ? "success" : "destructive"
          }
        >
          {row.original.status === "resolved" ? "Resolved" : "Open"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original;
        const isResolved = item.status === "resolved";
        return (
          <div className="flex items-center gap-2">
            {item.imageUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGalleryImages(
                    item.imageUrl
                      ? [{ url: item.imageUrl, filename: item.imageFilename }]
                      : [],
                  );
                  setActiveGalleryUrl(item.imageUrl ?? null);
                  setGalleryOpen(true);
                }}
              >
                View image
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={isResolved ? "secondary" : "default"}
              disabled={isResolved}
              onClick={() => {
                setResolvingIssueId(item.id);
                setResolveRemark("");
                setResolveOpen(true);
              }}
            >
              {isResolved ? "Resolved" : "Resolve"}
            </Button>
          </div>
        );
      },
    },
  ];

  const resolvingIssue = useMemo(
    () => issueRows.find((i) => i.id === resolvingIssueId) ?? null,
    [issueRows, resolvingIssueId],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inspection === null || inspection === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Inspection not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_INSPECTIONS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inspections
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      data-containerid="dashboard-inspections-view"
      data-testid="screen-dashboard-inspections-view"
      className="space-y-6"
    >
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={galleryImages}
        activeUrl={activeGalleryUrl}
        onActiveUrlChange={setActiveGalleryUrl}
        title="Inspection images"
        description="Click a thumbnail to preview, or download the selected image."
        onRaiseIssue={(img) => {
          setActiveGalleryUrl(img.url);
          setRaiseIssueOpen(true);
        }}
      />
      <RaiseIssueDialog
        open={raiseIssueOpen}
        onOpenChange={setRaiseIssueOpen}
        target={
          activeGalleryUrl
            ? {
                type: "image",
                inspectionId: inspection.id,
                imageUrl: activeGalleryUrl,
                imageFilename: galleryImages.find(
                  (i) => i.url === activeGalleryUrl,
                )?.filename,
              }
            : { type: "inspection", inspectionId: inspection.id }
        }
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
        }}
      />
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="font-medium">
                {resolvingIssue?.title ?? "Issue"}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                Add remarks for resolution audit trail.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-remark">Resolution remarks</Label>
              <Textarea
                id="resolve-remark"
                value={resolveRemark}
                onChange={(e) => setResolveRemark(e.target.value)}
                placeholder="What was done to resolve this issue?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!resolvingIssue || resolveRemark.trim().length === 0}
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
              Mark as resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={PAGES.DASHBOARD_INSPECTIONS}
            aria-label="Back to inspections"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inspection {inspection.id}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <InspectionTypeBadge inspectionType={inspection.inspection_type} />
            <Badge variant="outline" className="text-xs font-normal">
              {formatDate(inspection.created_at)}
            </Badge>
          </div>
        </div>
      </div>

      <TabbedSurface>
        <Tabs value={tab} onValueChange={setTab}>
          <TabbedButtons
            value={tab}
            onValueChange={setTab}
            className="w-full justify-start"
            items={[
              { value: "overview", label: "Overview" },
              { value: "outer-packaging", label: "Outer Packaging" },
              { value: "inner-packaging", label: "Inner Packaging" },
              { value: "product", label: "Product Inspection" },
              { value: "images", label: "Inspection Images" },
              { value: "relationship", label: "Relationship" },
              { value: "flags", label: "Issues/Flags" },
            ]}
          />

          <TabsContent value="overview" className="space-y-6">
            <Card className="gap-3 py-3 my-2">
              <CardHeader className="px-3">
                <CardTitle className="text-base">Quality Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {reviewLoading ? (
                  <div className="flex min-h-[120px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <KpiCardGrid
                    cards={reviewKpis}
                    className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                  />
                )}
              </CardContent>
            </Card>
            <ChecksSummaryDialog
              open={checksDialogOpen}
              onOpenChange={setChecksDialogOpen}
              mode={checksDialogMode}
              onModeChange={setChecksDialogMode}
              reviewCounts={{
                passed: reviewSummary.passed,
                failed: reviewSummary.failed,
              }}
              sectionRows={checksBySection}
              onViewImages={(r) => {
                setGalleryImages(r.images);
                setActiveGalleryUrl(r.images[0]?.url ?? null);
                setGalleryOpen(true);
              }}
            />
            <Card className="my-4">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                    <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{inspection.id}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <InspectionChecklistBadge
                        name={inspection.checklist_name}
                      />
                      <InspectionProductBadge
                        serial={inspection.product_serial}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Inspector</p>
                  <Link
                    to={PAGES.userViewPath(inspection.inspector_id)}
                    className="text-primary hover:underline"
                  >
                    {inspection.inspector_name}
                  </Link>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Device</p>
                  <Link
                    to={PAGES.deviceViewPath(inspection.device_id)}
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {inspection.device_fingerprint}
                  </Link>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Product</p>
                  <p className="font-mono text-sm">
                    {inspection.product_serial}
                  </p>
                </div>
                {inspection.product_category_name ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm">
                      Product category
                    </p>
                    <p className="text-sm">
                      {inspection.product_category_name}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Checklist</p>
                  <p className="text-sm">{inspection.checklist_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Type</p>
                  <InspectionTypeBadge
                    inspectionType={inspection.inspection_type}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Date</p>
                  <p className="text-sm">{formatDate(inspection.created_at)}</p>
                </div>
                <div className="space-y-1 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveGalleryUrl(null);
                      setRaiseIssueOpen(true);
                    }}
                  >
                    <Bug className="h-4 w-4" />
                    Raise an issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(["outer-packaging", "inner-packaging", "product"] as const).map(
            (k) => (
              <TabsContent key={k} value={k} className="space-y-4">
                <Card className="gap-3 py-3">
                  <CardHeader className="px-3">
                    <CardTitle className="text-base">
                      {k === "outer-packaging"
                        ? "Outer packaging"
                        : k === "inner-packaging"
                          ? "Inner packaging"
                          : "Product"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3">
                    {sectionLoading ? (
                      <div className="flex min-h-[160px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <InspectionQuestionResultsTable
                        rows={sectionRows}
                        onViewImages={(r) => {
                          setGalleryImages(r.images);
                          setActiveGalleryUrl(r.images[0]?.url ?? null);
                          setGalleryOpen(true);
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ),
          )}

          <TabsContent value="relationship" className="space-y-4">
            <Card className="gap-3 py-3">
              <CardHeader className="px-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Inbound - Outbound Relationship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-3">
                {relationshipLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !relationship ? (
                  <div className="text-muted-foreground py-10 text-center text-sm">
                    Relationship data not available.
                  </div>
                ) : (
                  <>
                    <KpiCardGrid
                      className="grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                      cards={[
                        {
                          label: "Inbound",
                          value: "Available",
                          icon: CheckCircle,
                          className:
                            "border-green-200 bg-green-50/30 hover:bg-green-50/30 dark:bg-green-900/10",
                        },
                        {
                          label: "Outbound",
                          value: relationship.outbound
                            ? "Linked"
                            : "Not linked",
                          icon: relationship.outbound ? CheckCircle : XCircle,
                          className: relationship.outbound
                            ? "border-green-200 bg-green-50/30 hover:bg-green-50/30 dark:bg-green-900/10"
                            : "border-red-200 bg-red-50/30 hover:bg-red-50/30 dark:bg-red-900/10",
                        },
                        {
                          label: "Flow",
                          value: relationship.outbound
                            ? "Inbound with Outbound"
                            : "Inbound only",
                          icon: GitBranch,
                        },
                      ]}
                    />

                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/10 via-background to-muted/20 p-4">
                      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] [background-size:20px_20px]" />
                      <div className="relative grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                              Inbound Inspection
                            </div>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                            >
                              <Link
                                to={PAGES.inspectionViewPath(
                                  relationship.inbound.inspectionId,
                                )}
                              >
                                Open
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="text-muted-foreground text-xs font-medium">
                              {relationship.inbound.inspectionId}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{relationship.inbound.personName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-xs">
                                {relationship.inbound.deviceFingerprint}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatDate(relationship.inbound.scannedAt)}
                            </div>
                          </div>
                        </div>

                        <div className="relative flex items-center justify-center py-3 lg:py-0">
                          <div
                            className={
                              relationship.outbound
                                ? "h-[2px] w-20 bg-gradient-to-r from-emerald-500 via-primary to-blue-500 animate-pulse lg:w-28"
                                : "h-[2px] w-20 border-t border-dashed border-muted-foreground/50 lg:w-28"
                            }
                          />
                          <ArrowRight className="text-muted-foreground absolute h-4 w-4 bg-background" />
                        </div>

                        {relationship.outbound ? (
                          <div className="rounded-xl border border-blue-300/60 bg-blue-50/60 p-4 shadow-sm dark:border-blue-800 dark:bg-blue-950/20">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                Outbound Inspection
                              </div>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                              >
                                <Link
                                  to={PAGES.inspectionViewPath(
                                    relationship.outbound.inspectionId,
                                  )}
                                >
                                  Open
                                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="text-muted-foreground text-xs font-medium">
                                {relationship.outbound.inspectionId}
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{relationship.outbound.personName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-xs">
                                  {relationship.outbound.deviceFingerprint}
                                </span>
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {formatDate(relationship.outbound.scannedAt)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                            <div className="text-muted-foreground text-sm">
                              Outbound scan not available
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <Card className="gap-3 py-3">
              <CardHeader className="px-3">
                <CardTitle className="text-base">
                  All inspection images ({allImages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {reviewLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : allImages.length === 0 ? (
                  <div className="text-muted-foreground py-10 text-center text-sm">
                    No images available
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {allImages.map((img) => (
                      <button
                        key={img.key}
                        type="button"
                        onClick={() => {
                          setGalleryImages(allGalleryImages);
                          setActiveGalleryUrl(img.url);
                          setGalleryOpen(true);
                        }}
                        className="group rounded-md border bg-muted/20 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-t-md">
                          <img
                            src={img.url}
                            alt={img.filename ?? "Inspection image"}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="space-y-1 p-2">
                          <p className="text-xs font-medium capitalize">
                            {img.section.replace("-", " ")}
                          </p>
                          <p className="text-muted-foreground line-clamp-2 text-xs">
                            {img.question}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="flags" className="space-y-4">
            <Card className="gap-3 py-3">
              <CardContent className="px-3">
                {reviewLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DataTable<InspectionIssueRow>
                    columns={issueColumns}
                    data={issueRows}
                    filters={issuesFilters}
                    searchKey="title"
                    rangeLabel="issues"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabbedSurface>
    </div>
  );
}
