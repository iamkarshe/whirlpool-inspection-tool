import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Calendar,
  ExternalLink,
  GitBranch,
  Loader2,
  MapPin,
  Smartphone,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

import { DeviceFingerprintLinkBadge } from "@/components/dashboard/device-fingerprint-link-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import { cn } from "@/lib/utils";
import { InspectionReviewStatusBadge } from "@/pages/dashboard/inspections/components/inspection-detail-presenters";
import { InspectionIdLinkBadge } from "@/pages/dashboard/inspections/inspection-badge";
import type {
  InspectionRelationship,
  InspectionRelationshipScan,
} from "@/pages/dashboard/inspections/inspection-service";

type Props = {
  relationshipLoading: boolean;
  relationship: InspectionRelationship | null;
  currentInspectionId: string;
};

type Side = "inbound" | "outbound";

function formatScanGap(fromIso: string, toIso: string): string | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  const mins = Math.round((to - from) / 60_000);
  if (mins < 60) return `${mins} min in facility`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 48) {
    return rem > 0 ? `${hours}h ${rem}m in facility` : `${hours}h in facility`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} in facility`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-border/60 py-2.5 last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

function FlowJourneyBar({
  inbound,
  outbound,
}: {
  inbound: InspectionRelationshipScan | null;
  outbound: InspectionRelationshipScan | null;
}) {
  const gap =
    inbound && outbound
      ? formatScanGap(inbound.scannedAt, outbound.scannedAt)
      : null;

  const sameDevice =
    inbound &&
    outbound &&
    inbound.deviceFingerprint === outbound.deviceFingerprint;

  let narrative = "Inspection journey for this unit serial.";
  if (inbound && outbound) {
    narrative =
      "Unit was received, inspected in the facility, then scanned again before dispatch.";
  } else if (inbound) {
    narrative =
      "Unit was received and inspected. Outbound dispatch scan is not on record yet.";
  } else if (outbound) {
    narrative =
      "Outbound dispatch scan is on record. Linked inbound receive scan was not found.";
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              inbound
                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Inbound</p>
            <p className="text-sm font-medium text-foreground">
              {inbound ? formatDate(inbound.scannedAt) : "Not recorded"}
            </p>
          </div>
        </div>

        <ArrowRight
          className="text-muted-foreground hidden h-4 w-4 shrink-0 sm:block"
          aria-hidden
        />

        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              outbound
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUpFromLine className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Outbound
            </p>
            <p className="text-sm font-medium text-foreground">
              {outbound ? formatDate(outbound.scannedAt) : "Not recorded"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap gap-1.5">
          {gap ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              {gap}
            </Badge>
          ) : null}
          {sameDevice ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              <Smartphone className="mr-1 h-3 w-3" />
              Same device
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">
        {narrative}
      </p>
    </div>
  );
}

function ScanSideCard({
  side,
  scan,
  isCurrent,
}: {
  side: Side;
  scan: InspectionRelationshipScan | null;
  isCurrent: boolean;
}) {
  const isInbound = side === "inbound";
  const Icon = isInbound ? ArrowDownToLine : ArrowUpFromLine;
  const title = isInbound ? "Inbound" : "Outbound";
  const subtitle = isInbound
    ? "Receive scan when the unit arrived"
    : "Dispatch scan before shipment";

  const headerTone = isInbound
    ? "border-sky-200/80 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20"
    : "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20";

  const iconTone = isInbound
    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";

  const hasChecks =
    scan &&
    (scan.passedChecks !== undefined || scan.failedChecks !== undefined) &&
    (scan.passedChecks ?? 0) + (scan.failedChecks ?? 0) > 0;

  return (
    <Card
      className={cn(
        "h-full gap-0 py-0 shadow-sm",
        isCurrent && "ring-2 ring-primary/20",
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-start justify-between gap-3 border-b px-4 py-3.5",
          headerTone,
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              scan ? iconTone : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {scan ? (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              Recorded
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              Not recorded
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 py-1">
        {scan ? (
          <>
            <dl>
              <DetailRow label="Inspection">
                <InspectionIdLinkBadge
                  id={scan.inspectionId}
                  truncate={false}
                />
              </DetailRow>
              <DetailRow label="Inspector">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <User className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  {scan.personName}
                </span>
              </DetailRow>
              <DetailRow label="Device">
                <DeviceFingerprintLinkBadge
                  deviceUuid={scan.deviceUuid}
                  fingerprint={scan.deviceFingerprint}
                />
              </DetailRow>
              <DetailRow label="Scanned">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <time dateTime={scan.scannedAt}>
                    {formatDate(scan.scannedAt)}
                  </time>
                </span>
              </DetailRow>
              {scan.plantCode || scan.warehouseCode ? (
                <DetailRow label="Location">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    {[scan.plantCode, scan.warehouseCode]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </DetailRow>
              ) : null}
              {scan.reviewStatus ? (
                <DetailRow label="Review">
                  <InspectionReviewStatusBadge status={scan.reviewStatus} />
                </DetailRow>
              ) : null}
              {hasChecks ? (
                <DetailRow label="Checks">
                  <span className="font-medium">
                    {scan.passedChecks ?? 0} passed
                    {(scan.failedChecks ?? 0) > 0 ? (
                      <span className="text-destructive">
                        {" "}
                        · {scan.failedChecks} failed
                      </span>
                    ) : null}
                  </span>
                </DetailRow>
              ) : null}
            </dl>
            <div className="border-t py-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-xs"
              >
                <Link to={PAGES.inspectionViewPath(scan.inspectionId)}>
                  Open inspection
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              No {title.toLowerCase()} scan
            </p>
            <p className="text-muted-foreground mt-1.5 max-w-[240px] text-xs leading-relaxed">
              {isInbound
                ? "Receive inspection details will appear here once linked to this unit."
                : "Dispatch inspection details will appear here once the unit is scanned for outbound."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InspectionRelationshipTab({
  relationshipLoading,
  relationship,
  currentInspectionId,
}: Props) {
  const inbound = relationship?.inbound ?? null;
  const outbound = relationship?.outbound ?? null;

  return (
    <TabsContent value="relationship" className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch
          className="text-muted-foreground h-4 w-4 shrink-0"
          aria-hidden
        />
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Inspection journey
          </h2>
          <p className="text-muted-foreground text-sm">
            How this unit moved from receive to dispatch.
          </p>
        </div>
      </div>

      {relationshipLoading ? (
        <Card>
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Loading linked scans…
            </p>
          </CardContent>
        </Card>
      ) : !relationship ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center">
            <GitBranch className="text-muted-foreground mb-3 h-7 w-7" />
            <p className="text-sm font-medium">Linked scans unavailable</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Could not load inbound or outbound details for this unit. Try
              refreshing the page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <FlowJourneyBar inbound={inbound} outbound={outbound} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ScanSideCard
              side="inbound"
              scan={inbound}
              isCurrent={inbound?.inspectionId === currentInspectionId}
            />
            <ScanSideCard
              side="outbound"
              scan={outbound}
              isCurrent={outbound?.inspectionId === currentInspectionId}
            />
          </div>
        </>
      )}
    </TabsContent>
  );
}
