import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  GitBranch,
  Loader2,
  User,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { DeviceFingerprintLinkBadge } from "@/components/dashboard/device-fingerprint-link-badge";
import { KpiCardGrid } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { PAGES } from "@/endpoints";
import type { InspectionRelationship } from "@/pages/dashboard/inspections/inspection-service";
import { formatDate } from "@/lib/core";

type Props = {
  relationshipLoading: boolean;
  relationship: InspectionRelationship | null;
};

export function InspectionRelationshipTab({
  relationshipLoading,
  relationship,
}: Props) {
  return (
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
                    value: relationship.outbound ? "Linked" : "Not linked",
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
                      <Button asChild size="sm" variant="outline" className="h-7 px-2">
                        <Link to={PAGES.inspectionViewPath(relationship.inbound.inspectionId)}>
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
                      <div>
                        <DeviceFingerprintLinkBadge
                          deviceUuid={relationship.inbound.deviceUuid}
                          fingerprint={relationship.inbound.deviceFingerprint}
                        />
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
                          ? "h-[2px] w-20 animate-pulse bg-gradient-to-r from-emerald-500 via-primary to-blue-500 lg:w-28"
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
                        <Button asChild size="sm" variant="outline" className="h-7 px-2">
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
                        <div>
                          <DeviceFingerprintLinkBadge
                            deviceUuid={relationship.outbound.deviceUuid}
                            fingerprint={
                              relationship.outbound.deviceFingerprint
                            }
                          />
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
  );
}
