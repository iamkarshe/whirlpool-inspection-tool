import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";

import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/core";
import type {
  IssueSeverity,
  IssueType,
} from "@/components/dialogs/raise-issue-dialog";
import type { InspectionSectionKey } from "@/pages/dashboard/inspections/inspection-service";
import {
  formatIssueSeverity,
  formatIssueStatus,
  issueSeverityBadgeClass,
} from "@/pages/dashboard/inspections/components/view-tabs/inspection-issue-presenters";

export type InspectionIssueRow = {
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
};

type Props = {
  reviewLoading: boolean;
  issueRows: InspectionIssueRow[];
  onViewImage: (url: string, filename?: string) => void;
  onResolve: (issueId: string) => void;
};

export function InspectionFlagsTab({
  reviewLoading,
  issueRows,
  onViewImage,
  onResolve,
}: Props) {
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
          className={issueSeverityBadgeClass(row.original.severity)}
        >
          {formatIssueSeverity(row.original.severity)}
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
          {formatIssueStatus(row.original.status)}
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
                onClick={() =>
                  onViewImage(item.imageUrl ?? "", item.imageFilename)
                }
              >
                View image
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={isResolved ? "secondary" : "default"}
              disabled={isResolved}
              onClick={() => onResolve(item.id)}
            >
              {isResolved ? "Resolved" : "Resolve"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
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
  );
}
