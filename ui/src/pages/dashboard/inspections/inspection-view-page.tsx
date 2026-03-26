import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import { ImageGalleryDialog, type GalleryImage } from "@/components/image-gallery-dialog";
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
import type { ColumnDef } from "@tanstack/react-table";
import { Badge as StatusBadge } from "@/components/ui/badge";

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
  const [sectionRows, setSectionRows] = useState<InspectionQuestionResult[]>([]);

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

  const questionColumns = useMemo((): ColumnDef<InspectionQuestionResult, unknown>[] => {
    return [
      {
        accessorKey: "status",
        header: "Result",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <StatusBadge
              variant="outline"
              className={
                status === "pass"
                  ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
              }
            >
              {status.toUpperCase()}
            </StatusBadge>
          );
        },
      },
      {
        accessorKey: "question",
        header: "Question",
        cell: ({ row }) => <div className="whitespace-normal">{row.original.question}</div>,
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <div className="text-muted-foreground whitespace-normal">
            {row.original.notes ?? "—"}
          </div>
        ),
      },
      {
        id: "images",
        header: "Images",
        cell: ({ row }) => {
          const images = row.original.images ?? [];
          if (images.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGalleryImages(images);
                setActiveGalleryUrl(images[0]?.url ?? null);
                setGalleryOpen(true);
              }}
            >
              View ({images.length})
            </Button>
          );
        },
      },
    ];
  }, []);

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
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{inspection.id}</CardTitle>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <InspectionChecklistBadge name={inspection.checklist_name} />
                    <InspectionProductBadge serial={inspection.product_serial} />
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
                  <p className="text-muted-foreground text-sm">Product category</p>
                  <p className="text-sm">{inspection.product_category_name}</p>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Checklist</p>
                <p className="text-sm">{inspection.checklist_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Type</p>
                <InspectionTypeBadge inspectionType={inspection.inspection_type} />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Date</p>
                <p className="text-sm">{formatDate(inspection.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(["outer-packaging", "inner-packaging", "product", "device"] as const).map(
          (k) => (
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
                    <DataTable<InspectionQuestionResult>
                      columns={questionColumns}
                      data={sectionRows}
                      searchKey="question"
                      rangeLabel="checks"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ),
        )}
      </Tabs>
    </div>
  );
}
