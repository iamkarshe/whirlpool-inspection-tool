import { TimeDisplay } from "@/components/time-display";
import { cn } from "@/lib/utils";
import {
  InspectionDetailField,
  InspectionDetailSection,
  InspectionReviewStatusBadge,
  formatInspectionDuration,
  formatInspectionReviewerLabel,
  inspectionWasAutoApproved,
} from "@/pages/dashboard/inspections/components/inspection-detail-presenters";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { Building2, CalendarClock, Timer } from "lucide-react";

export function InspectionDetailInfoSections({
  inspection,
}: {
  inspection: Inspection;
}) {
  const hasReviewMeta =
    Boolean(inspection.reviewer_name?.trim()) ||
    Boolean(inspection.reviewed_at?.trim()) ||
    Boolean(inspection.reviewed_comment?.trim());

  const unitSerial =
    inspection.inspection_serial_number?.trim() ||
    inspection.serial_number?.trim() ||
    null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <InspectionDetailSection
        title="Product & unit"
        description="Material and serial identity"
        tone="product"
      >
        <InspectionDetailField label="Material code" mono>
          {inspection.product_serial || "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Category">
          {inspection.product_category_name?.trim() || "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Model / description">
          {inspection.product_description?.trim() || "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Unit serial" mono>
          {unitSerial ?? "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Unit barcode" mono>
          {inspection.product_barcode?.trim() || "—"}
        </InspectionDetailField>
        {typeof inspection.manufactured_year === "number" ? (
          <InspectionDetailField label="Mfg. year">
            {inspection.manufactured_year}
          </InspectionDetailField>
        ) : null}
      </InspectionDetailSection>

      <InspectionDetailSection
        title="Location"
        description="Warehouse and plant codes"
        tone="location"
      >
        <InspectionDetailField label="Warehouse">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            {inspection.warehouse_code?.trim() || "—"}
          </span>
        </InspectionDetailField>
        <InspectionDetailField label="Supplier plant">
          {inspection.plant_code?.trim() || "—"}
        </InspectionDetailField>
      </InspectionDetailSection>

      <InspectionDetailSection
        title="Shipment & timing"
        description="Dock, truck, and scan duration"
        tone="shipment"
      >
        <InspectionDetailField label="Dock">
          {inspection.dock_number?.trim() || "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Truck number">
          {inspection.truck_number?.trim() || "—"}
        </InspectionDetailField>
        <InspectionDetailField label="Docking time">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            {inspection.truck_docking_time?.trim() ? (
              <TimeDisplay iso={inspection.truck_docking_time.trim()} />
            ) : (
              "—"
            )}
          </span>
        </InspectionDetailField>
        <InspectionDetailField label="Time on device">
          <span className="inline-flex items-center gap-1.5">
            <Timer className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            {formatInspectionDuration(inspection.device_time_taken)}
          </span>
        </InspectionDetailField>
      </InspectionDetailSection>

      {hasReviewMeta ? (
        <InspectionDetailSection
          title="Quality review"
          description="Manager sign-off on this scan"
          tone="review"
          className="sm:col-span-2 lg:col-span-3"
        >
          <div
            className={cn(
              "grid gap-1.5",
              inspection.reviewed_comment?.trim()
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2",
            )}
          >
            <InspectionDetailField label="Reviewer">
              <span
                className={
                  inspectionWasAutoApproved(inspection)
                    ? "font-semibold text-amber-800 dark:text-amber-200"
                    : undefined
                }
              >
                {formatInspectionReviewerLabel(inspection)}
              </span>
            </InspectionDetailField>
            <InspectionDetailField label="Reviewed at">
              {inspection.reviewed_at?.trim() ? (
                <TimeDisplay iso={inspection.reviewed_at.trim()} />
              ) : (
                "—"
              )}
            </InspectionDetailField>
            <InspectionDetailField label="Status">
              <InspectionReviewStatusBadge status={inspection.review_status} />
            </InspectionDetailField>
            {inspection.reviewed_comment?.trim() ? (
              <InspectionDetailField
                label="Comment"
                className="sm:col-span-2 lg:col-span-3"
              >
                <span className="whitespace-pre-wrap font-normal">
                  {inspection.reviewed_comment.trim()}
                </span>
              </InspectionDetailField>
            ) : null}
          </div>
        </InspectionDetailSection>
      ) : null}
    </div>
  );
}
