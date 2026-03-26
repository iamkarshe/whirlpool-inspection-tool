import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import {
  ImageGalleryDialog,
  type GalleryImage,
} from "@/components/image-gallery-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  InspectionChecklistBadge,
  InspectionProductBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionById,
  getInspectionQuestionResults,
  type Inspection,
  type InspectionQuestionResult,
  type InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle, Package, Box, ShoppingBag } from "lucide-react";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

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

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);

  const tab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const t = (params.get("tab") ?? "overview").toLowerCase();
    const allowed = new Set([
      "overview",
      "outer-packaging",
      "inner-packaging",
      "product",
      "device",
      "images",
    ]);
    return allowed.has(t) ? t : "overview";
  }, [location.search]);

  const sectionKey = useMemo((): InspectionSectionKey | null => {
    if (tab === "outer-packaging") return "outer-packaging";
    if (tab === "inner-packaging") return "inner-packaging";
    if (tab === "product") return "product";
    if (tab === "device") return "device";
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
      },
      {
        label: "Failed checks",
        value: reviewSummary.failed,
        icon: XCircle,
        className:
          "border-red-200 bg-red-50/30 hover:bg-red-50/50 dark:bg-red-900/10",
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

  function SectionSimpleTable({ rows }: { rows: InspectionQuestionResult[] }) {
    return (
      <div className="rounded-md border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px]">Result</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-[40%]">Notes</TableHead>
              <TableHead className="w-[120px] text-right">Images</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-10 text-center"
                >
                  No checks
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isPass = r.status === "pass";
                const rowClass = isPass
                  ? "border-l-4 border-l-green-400 bg-green-50/40 hover:bg-green-50/60 dark:bg-green-900/10"
                  : "border-l-4 border-l-red-400 bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/10";
                return (
                  <TableRow key={r.id} className={rowClass}>
                    <TableCell className="py-2">
                      <span
                        className={
                          isPass
                            ? "inline-flex rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : "inline-flex rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        }
                      >
                        {isPass ? "PASS" : "FAIL"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal font-medium">
                      {r.question}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2 whitespace-normal">
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {r.images?.length ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGalleryImages(r.images);
                            setActiveGalleryUrl(r.images[0]?.url ?? null);
                            setGalleryOpen(true);
                          }}
                        >
                          View ({r.images.length})
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="overview">Inspection overview</TabsTrigger>
          <TabsTrigger value="outer-packaging">Outer packaging</TabsTrigger>
          <TabsTrigger value="inner-packaging">Inner packaging</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="device">Device</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="gap-3 py-3">
            <CardHeader className="px-3">
              <CardTitle className="text-base">Quality summary</CardTitle>
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

          <Card className="mt-[-12px]">
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
                <p className="font-mono text-sm">{inspection.product_serial}</p>
              </div>
              {inspection.product_category_name ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    Product category
                  </p>
                  <p className="text-sm">{inspection.product_category_name}</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        {(
          ["outer-packaging", "inner-packaging", "product", "device"] as const
        ).map((k) => (
          <TabsContent key={k} value={k} className="space-y-4">
            <Card className="gap-3 py-3">
              <CardHeader className="px-3">
                <CardTitle className="text-base">
                  {k === "outer-packaging"
                    ? "Outer packaging"
                    : k === "inner-packaging"
                      ? "Inner packaging"
                      : k === "product"
                        ? "Product"
                        : "Device"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {sectionLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <SectionSimpleTable rows={sectionRows} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

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
      </Tabs>
    </div>
  );
}
