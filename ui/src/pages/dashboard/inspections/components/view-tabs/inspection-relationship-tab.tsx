import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Calendar,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Link2,
  Link2Off,
  Loader2,
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
import { InspectionIdLinkBadge } from "@/pages/dashboard/inspections/inspection-badge";
import type {
  InspectionRelationship,
  InspectionRelationshipScan,
} from "@/pages/dashboard/inspections/inspection-service";

type Props = {
  relationshipLoading: boolean;
  relationship: InspectionRelationship | null;
};

function formatScanGap(fromIso: string, toIso: string): string | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  const mins = Math.round((to - from) / 60_000);
  if (mins < 60) return `${mins} min between scans`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 48) {
    return rem > 0 ? `${hours}h ${rem}m between scans` : `${hours}h between scans`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} between scans`;
}

function RelationshipStatusBanner({
  linked,
}: {
  linked: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
        linked
          ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-background to-sky-50/80 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-sky-950/20"
          : "border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-background to-muted/30 dark:border-amber-900/40 dark:from-amber-950/20",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          linked
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
        )}
      >
        {linked ? (
          <Link2 className="h-5 w-5" aria-hidden />
        ) : (
          <Link2Off className="h-5 w-5" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight">
          {linked ? "Inbound and outbound are linked" : "Awaiting outbound link"}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {linked
            ? "This unit was scanned on the way in and matched to an outbound inspection."
            : "Inbound is recorded. Outbound will appear here once the unit is scanned for dispatch."}
        </p>
      </div>
      <Badge
        variant={linked ? "default" : "secondary"}
        className={cn(
          "shrink-0 uppercase tracking-wide",
          linked && "bg-emerald-600 hover:bg-emerald-600/90",
        )}
      >
        {linked ? "Complete flow" : "Inbound only"}
      </Badge>
    </div>
  );
}

function ScanMetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm ring-1 ring-border/60">
        <Icon className="text-muted-foreground h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

function RelationshipScanCard({
  variant,
  scan,
}: {
  variant: "inbound" | "outbound";
  scan: InspectionRelationshipScan;
}) {
  const isInbound = variant === "inbound";
  const Icon = isInbound ? ArrowDownToLine : ArrowUpFromLine;
  const initials = scan.personName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md",
        isInbound
          ? "border-emerald-300/70 bg-gradient-to-b from-emerald-50/90 to-background dark:border-emerald-800/60 dark:from-emerald-950/25"
          : "border-sky-300/70 bg-gradient-to-b from-sky-50/90 to-background dark:border-sky-800/60 dark:from-sky-950/25",
      )}
    >
      <div
        className={cn(
          "h-1 w-full",
          isInbound ? "bg-emerald-500" : "bg-sky-500",
        )}
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isInbound
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isInbound
                    ? "text-emerald-900 dark:text-emerald-100"
                    : "text-sky-900 dark:text-sky-100",
                )}
              >
                {isInbound ? "Inbound" : "Outbound"} inspection
              </p>
              <p className="text-muted-foreground text-xs">Warehouse scan</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
            <Link to={PAGES.inspectionViewPath(scan.inspectionId)}>
              Open
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="divide-y rounded-lg border bg-background/60">
          <div className="px-3">
            <ScanMetaRow icon={CheckCircle2} label="Inspection">
              <InspectionIdLinkBadge id={scan.inspectionId} truncate={false} />
            </ScanMetaRow>
          </div>
          <div className="px-3">
            <ScanMetaRow icon={User} label="Inspector">
              <div className="flex items-center gap-2">
                <span
                  className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                  aria-hidden
                >
                  {initials || "?"}
                </span>
                <span>{scan.personName}</span>
              </div>
            </ScanMetaRow>
          </div>
          <div className="px-3">
            <ScanMetaRow icon={Smartphone} label="Device">
              <DeviceFingerprintLinkBadge
                deviceUuid={scan.deviceUuid}
                fingerprint={scan.deviceFingerprint}
              />
            </ScanMetaRow>
          </div>
          <div className="px-3">
            <ScanMetaRow icon={Calendar} label="Scanned at">
              <time dateTime={scan.scannedAt}>{formatDate(scan.scannedAt)}</time>
            </ScanMetaRow>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutboundPlaceholder() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/35 bg-muted/15 px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted ring-1 ring-border">
        <ArrowUpFromLine className="text-muted-foreground h-6 w-6" aria-hidden />
      </div>
      <p className="text-sm font-semibold">No outbound scan yet</p>
      <p className="text-muted-foreground mt-2 max-w-xs text-xs leading-relaxed">
        When this product is inspected for outbound dispatch, the linked record
        will show here with inspector, device, and timestamp.
      </p>
    </div>
  );
}

function FlowConnector({ linked }: { linked: boolean }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center gap-2 py-4 lg:min-w-[7rem] lg:py-0"
      aria-hidden
    >
      <div className="hidden lg:block lg:h-full lg:w-px lg:bg-border" />
      <div
        className={cn(
          "flex items-center justify-center rounded-full border p-2 shadow-sm",
          linked
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
        )}
      >
        <ArrowRight className="h-4 w-4 lg:rotate-0" />
      </div>
      <div
        className={cn(
          "h-px w-16 lg:hidden",
          linked
            ? "bg-gradient-to-r from-emerald-500 via-primary to-sky-500"
            : "border-t border-dashed border-muted-foreground/50 bg-transparent",
        )}
      />
      <div
        className={cn(
          "hidden h-[2px] lg:block lg:w-24",
          linked
            ? "bg-gradient-to-r from-emerald-500 via-primary to-sky-500"
            : "border-t-2 border-dashed border-muted-foreground/40 bg-transparent",
        )}
      />
      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {linked ? "Linked" : "Pending"}
      </span>
    </div>
  );
}

export function InspectionRelationshipTab({
  relationshipLoading,
  relationship,
}: Props) {
  const linked = Boolean(relationship?.outbound);
  const scanGap =
    relationship?.outbound &&
    formatScanGap(relationship.inbound.scannedAt, relationship.outbound.scannedAt);
  const sameDevice =
    linked &&
    relationship.inbound.deviceFingerprint ===
      relationship.outbound!.deviceFingerprint;

  return (
    <TabsContent value="relationship" className="space-y-4">
      <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <GitBranch className="text-primary h-5 w-5 shrink-0" />
            <span>Inbound → Outbound relationship</span>
          </CardTitle>
          <p className="text-muted-foreground text-sm font-normal">
            Trace how this unit moved through inbound receiving and outbound
            dispatch.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 px-4 py-6 sm:px-6">
          {relationshipLoading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                Loading relationship…
              </p>
            </div>
          ) : !relationship ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
              <GitBranch className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-sm font-medium">Relationship unavailable</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                We could not load linked scans for this inspection. Try
                refreshing or open the inspection again.
              </p>
            </div>
          ) : (
            <>
              <RelationshipStatusBanner linked={linked} />

              {(scanGap || sameDevice) && (
                <div className="flex flex-wrap gap-2">
                  {scanGap ? (
                    <Badge variant="outline" className="font-normal">
                      <Calendar className="mr-1 h-3 w-3" />
                      {scanGap}
                    </Badge>
                  ) : null}
                  {sameDevice ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-300/60 bg-emerald-50/50 font-normal text-emerald-800 dark:text-emerald-200"
                    >
                      <Smartphone className="mr-1 h-3 w-3" />
                      Same device on both scans
                    </Badge>
                  ) : null}
                </div>
              )}

              <div className="relative rounded-2xl border bg-gradient-to-br from-muted/20 via-background to-muted/10 p-4 sm:p-6">
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 [background-image:radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] [background-size:24px_24px]"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:gap-6">
                  <RelationshipScanCard
                    variant="inbound"
                    scan={relationship.inbound}
                  />
                  <FlowConnector linked={linked} />
                  {relationship.outbound ? (
                    <RelationshipScanCard
                      variant="outbound"
                      scan={relationship.outbound}
                    />
                  ) : (
                    <OutboundPlaceholder />
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
