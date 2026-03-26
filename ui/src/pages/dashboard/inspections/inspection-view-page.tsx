import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle, Package, Box, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import { type GalleryImage } from "@/components/image-gallery-dialog";
import { type RaiseIssuePayload } from "@/components/dialogs/raise-issue-dialog";
import { type KpiCardProps } from "@/components/kpi-card";
import { TabbedButtons } from "@/components/tabbed-nav";
import { TabbedSurface } from "@/components/tabbed-content";
import { InspectionTypeBadge } from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionById,
  getInspectionRelationship,
  getInspectionQuestionResults,
  type Inspection,
  type InspectionRelationship,
  type InspectionQuestionResult,
  type InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";
import { formatDate, setPageTitle } from "@/lib/core";
import { InspectionOverviewTab } from "@/pages/dashboard/inspections/components/view-tabs/inspection-overview-tab";
import { InspectionSectionTab } from "@/pages/dashboard/inspections/components/view-tabs/inspection-section-tab";
import { InspectionRelationshipTab } from "@/pages/dashboard/inspections/components/view-tabs/inspection-relationship-tab";
import { InspectionImagesTab } from "@/pages/dashboard/inspections/components/view-tabs/inspection-images-tab";
import {
  InspectionFlagsTab,
  type InspectionIssueRow,
} from "@/pages/dashboard/inspections/components/view-tabs/inspection-flags-tab";
import { inspectionTabTitle, inspectionViewTabItems } from "@/pages/dashboard/inspections/components/view-tabs/inspection-view-tab-items";
import { InspectionViewDialogs } from "@/pages/dashboard/inspections/components/view-tabs/inspection-view-dialogs";

type ManualIssue = Omit<InspectionIssueRow, "status">;

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

  const activeTabTitle = useMemo(() => {
    return inspectionTabTitle(tab);
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
    if (!inspection) return;
    setPageTitle(`${activeTabTitle} - Inspection ${inspection.id}`);
  }, [inspection, activeTabTitle]);

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
      };
    });
  }, [manualIssues, systemIssues, resolvedIssues]);

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
      <InspectionViewDialogs
        inspectionId={inspection.id}
        galleryOpen={galleryOpen}
        setGalleryOpen={setGalleryOpen}
        galleryImages={galleryImages}
        activeGalleryUrl={activeGalleryUrl}
        setActiveGalleryUrl={setActiveGalleryUrl}
        raiseIssueOpen={raiseIssueOpen}
        setRaiseIssueOpen={setRaiseIssueOpen}
        onRaiseIssueSubmit={(payload: RaiseIssuePayload) => {
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
        resolveOpen={resolveOpen}
        setResolveOpen={setResolveOpen}
        resolvingIssueTitle={resolvingIssue?.title}
        resolveRemark={resolveRemark}
        setResolveRemark={setResolveRemark}
        onResolveConfirm={() => {
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
      />
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
            {activeTabTitle}
          </h1>
          <div className="text-muted-foreground mt-1 text-sm">
            Inspection {inspection.id}
          </div>
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
            items={[...inspectionViewTabItems]}
          />

          <InspectionOverviewTab
            reviewLoading={reviewLoading}
            reviewKpis={reviewKpis}
            checksDialogOpen={checksDialogOpen}
            setChecksDialogOpen={setChecksDialogOpen}
            checksDialogMode={checksDialogMode}
            setChecksDialogMode={setChecksDialogMode}
            reviewSummary={{
              passed: reviewSummary.passed,
              failed: reviewSummary.failed,
            }}
            checksBySection={checksBySection}
            onViewImages={(r) => {
              setGalleryImages(r.images);
              setActiveGalleryUrl(r.images[0]?.url ?? null);
              setGalleryOpen(true);
            }}
            inspection={inspection}
            onRaiseIssue={() => {
              setActiveGalleryUrl(null);
              setRaiseIssueOpen(true);
            }}
          />

          {(["outer-packaging", "inner-packaging", "product"] as const).map(
            (k) => (
              <InspectionSectionTab
                key={k}
                value={k}
                sectionLoading={sectionLoading}
                rows={sectionRows}
                onViewImages={(r) => {
                  setGalleryImages(r.images);
                  setActiveGalleryUrl(r.images[0]?.url ?? null);
                  setGalleryOpen(true);
                }}
              />
            ),
          )}

          <InspectionRelationshipTab
            relationshipLoading={relationshipLoading}
            relationship={relationship}
          />

          <InspectionImagesTab
            reviewLoading={reviewLoading}
            allImages={allImages}
            allGalleryImages={allGalleryImages}
            onOpenImage={(images, activeUrl) => {
              setGalleryImages(images);
              setActiveGalleryUrl(activeUrl);
              setGalleryOpen(true);
            }}
          />

          <InspectionFlagsTab
            reviewLoading={reviewLoading}
            issueRows={issueRows}
            onViewImage={(url, filename) => {
              setGalleryImages([{ url, filename }]);
              setActiveGalleryUrl(url);
              setGalleryOpen(true);
            }}
            onResolve={(issueId) => {
              setResolvingIssueId(issueId);
              setResolveRemark("");
              setResolveOpen(true);
            }}
          />
        </Tabs>
      </TabbedSurface>
    </div>
  );
}
