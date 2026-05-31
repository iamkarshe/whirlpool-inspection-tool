import { DeviceFingerprintLinkBadge } from "@/components/dashboard/device-fingerprint-link-badge";
import { formatDate } from "@/lib/core";
import {
  InspectionChecklistBadge,
  InspectionIdLinkBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import {
  InspectionDamageValueBadge,
  InspectionDetailRow,
  InspectionDetailSection,
  InspectionDetailTable,
  InspectionLinkedUuid,
  InspectionReviewStatusBadge,
  formatInspectionDuration,
  inspectionHasDamageRecorded,
} from "@/pages/dashboard/inspections/components/inspection-detail-presenters";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";

export function InspectionDetailInfoSections({
  inspection,
}: {
  inspection: Inspection;
}) {
  const hasReviewMeta =
    Boolean(inspection.reviewer_name?.trim()) ||
    Boolean(inspection.reviewed_at?.trim()) ||
    Boolean(inspection.reviewed_comment?.trim());

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InspectionDetailSection title="Product & unit">
        <InspectionDetailTable>
          <InspectionDetailRow label="Material code">
            <span className="font-mono">{inspection.product_serial || "—"}</span>
          </InspectionDetailRow>
          <InspectionDetailRow label="Category">
            <span className="whitespace-pre-wrap leading-snug">
              {inspection.product_category_name?.trim() || "—"}
            </span>
          </InspectionDetailRow>
          <InspectionDetailRow label="Model / description">
            <span className="whitespace-pre-wrap leading-snug">
              {inspection.product_description?.trim() || "—"}
            </span>
          </InspectionDetailRow>
          <InspectionDetailRow label="Unit serial">
            {inspection.inspection_serial_number?.trim() ||
            inspection.serial_number?.trim() ? (
              <span className="font-mono">
                {inspection.inspection_serial_number?.trim() ||
                  inspection.serial_number?.trim()}
              </span>
            ) : (
              "—"
            )}
          </InspectionDetailRow>
          <InspectionDetailRow label="Unit barcode">
            <span className="font-mono">
              {inspection.product_barcode?.trim() || "—"}
            </span>
          </InspectionDetailRow>
          {typeof inspection.manufactured_year === "number" ? (
            <InspectionDetailRow label="Manufactured year">
              {inspection.manufactured_year}
            </InspectionDetailRow>
          ) : null}
        </InspectionDetailTable>
      </InspectionDetailSection>

      <InspectionDetailSection title="Inspection">
        <InspectionDetailTable>
          <InspectionDetailRow label="Inspection ID">
            <InspectionIdLinkBadge id={inspection.id} truncate={false} />
          </InspectionDetailRow>
          <InspectionDetailRow label="Type">
            <InspectionTypeBadge inspectionType={inspection.inspection_type} />
          </InspectionDetailRow>
          <InspectionDetailRow label="Inspector">
            {inspection.inspector_name}
          </InspectionDetailRow>
          <InspectionDetailRow label="Device">
            <DeviceFingerprintLinkBadge
              deviceUuid={inspection.device_uuid}
              fingerprint={inspection.device_fingerprint}
            />
          </InspectionDetailRow>
          <InspectionDetailRow label="Scanned at">
            <time dateTime={inspection.created_at}>
              {formatDate(inspection.created_at)}
            </time>
          </InspectionDetailRow>
          <InspectionDetailRow label="Review status">
            <InspectionReviewStatusBadge status={inspection.review_status} />
          </InspectionDetailRow>
          {inspection.checklist_name?.trim() ? (
            <InspectionDetailRow label="Checklist">
              <InspectionChecklistBadge name={inspection.checklist_name} />
            </InspectionDetailRow>
          ) : null}
        </InspectionDetailTable>
      </InspectionDetailSection>

      <InspectionDetailSection title="Location">
        <InspectionDetailTable>
          <InspectionDetailRow label="Warehouse">
            {inspection.warehouse_code?.trim() || "—"}
          </InspectionDetailRow>
          <InspectionDetailRow label="Supplier plant">
            {inspection.plant_code?.trim() || "—"}
          </InspectionDetailRow>
        </InspectionDetailTable>
      </InspectionDetailSection>

      <InspectionDetailSection title="Shipment & timing">
        <InspectionDetailTable>
          <InspectionDetailRow label="Dock">
            {inspection.dock_number?.trim() || "—"}
          </InspectionDetailRow>
          <InspectionDetailRow label="Truck number">
            {inspection.truck_number?.trim() || "—"}
          </InspectionDetailRow>
          <InspectionDetailRow label="Docking time">
            {inspection.truck_docking_time?.trim()
              ? formatDate(inspection.truck_docking_time.trim())
              : "—"}
          </InspectionDetailRow>
          <InspectionDetailRow label="Time on device">
            {formatInspectionDuration(inspection.device_time_taken)}
          </InspectionDetailRow>
        </InspectionDetailTable>
      </InspectionDetailSection>

      {hasReviewMeta ? (
        <InspectionDetailSection title="Quality review" className="lg:col-span-2">
          <InspectionDetailTable>
            <InspectionDetailRow label="Reviewer">
              {inspection.reviewer_name?.trim() || "—"}
            </InspectionDetailRow>
            <InspectionDetailRow label="Reviewed at">
              {inspection.reviewed_at?.trim()
                ? formatDate(inspection.reviewed_at.trim())
                : "—"}
            </InspectionDetailRow>
            {inspection.reviewed_comment?.trim() ? (
              <InspectionDetailRow label="Comment">
                <span className="whitespace-pre-wrap font-normal leading-snug">
                  {inspection.reviewed_comment.trim()}
                </span>
              </InspectionDetailRow>
            ) : null}
          </InspectionDetailTable>
        </InspectionDetailSection>
      ) : null}

      <InspectionDetailSection title="Damage" className="lg:col-span-2">
        {inspectionHasDamageRecorded(inspection) ? (
          <InspectionDetailTable>
            <InspectionDetailRow label="Type">
              <InspectionDamageValueBadge
                kind="type"
                value={inspection.damage_type}
              />
            </InspectionDetailRow>
            <InspectionDetailRow label="Severity">
              <InspectionDamageValueBadge
                kind="severity"
                value={inspection.damage_severity}
              />
            </InspectionDetailRow>
            <InspectionDetailRow label="Cause">
              <InspectionDamageValueBadge
                kind="cause"
                value={inspection.damage_cause}
              />
            </InspectionDetailRow>
            <InspectionDetailRow label="Grade">
              <InspectionDamageValueBadge
                kind="grade"
                value={inspection.damage_grade}
              />
            </InspectionDetailRow>
          </InspectionDetailTable>
        ) : (
          <p className="text-muted-foreground text-sm">
            No damage recorded — all damage fields were left empty or set to NA
            at inspection start.
          </p>
        )}
      </InspectionDetailSection>

      {inspection.inbound_inspection_uuid?.trim() ||
      inspection.outbound_inspection_uuid?.trim() ? (
        <InspectionDetailSection title="Linked inspections" className="lg:col-span-2">
          <InspectionDetailTable>
            <InspectionDetailRow label="Inbound link">
              <InspectionLinkedUuid
                uuid={inspection.inbound_inspection_uuid}
                label="Inbound"
              />
            </InspectionDetailRow>
            <InspectionDetailRow label="Outbound link">
              <InspectionLinkedUuid
                uuid={inspection.outbound_inspection_uuid}
                label="Outbound"
              />
            </InspectionDetailRow>
          </InspectionDetailTable>
        </InspectionDetailSection>
      ) : null}
    </div>
  );
}
