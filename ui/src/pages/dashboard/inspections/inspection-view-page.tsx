import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import {
  InspectionChecklistBadge,
  InspectionProductBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionById,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  const [inspection, setInspection] = useState<Inspection | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
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
    </div>
  );
}
