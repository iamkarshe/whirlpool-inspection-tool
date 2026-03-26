import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DateRange } from "react-day-picker";

import {
  ImageGalleryDialog,
  type GalleryImage,
} from "@/components/image-gallery-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import { ChecksSummaryDialog } from "@/pages/dashboard/inspections/components/checks-summary-dialog";
import {
  InspectionIdLinkBadge,
  InspectionTypeBadge,
} from "@/pages/dashboard/inspections/inspection-badge";
import {
  getInspectionQuestionResults,
  type Inspection,
  type InspectionQuestionResult,
  type InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";

export type InspectionsDataTableProps = {
  data: Inspection[];
  /** When true, hide the Device column (e.g. on device inspections tab). */
  hideDeviceColumn?: boolean;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  downloadCsvFileName?: string;
  downloadCsv?: (rows: Inspection[]) => {
    headers: string[];
    rows: Record<string, unknown>[];
  };
};

function getSectionStatus(rows: InspectionQuestionResult[] | null) {
  if (!rows || rows.length === 0) return null;
  return rows.some((r) => r.status === "fail") ? "fail" : "pass";
}

function getSectionCounts(rows: InspectionQuestionResult[] | null) {
  const total = rows?.length ?? 0;
  const passed = rows ? rows.filter((r) => r.status === "pass").length : 0;
  const failed = rows ? rows.filter((r) => r.status === "fail").length : 0;
  return { total, passed, failed };
}

function SectionStatusCell({
  inspectionId,
  section,
  onOpenDialog,
}: {
  inspectionId: string;
  section: InspectionSectionKey;
  onOpenDialog: (inspectionId: string) => void;
}) {
  const [rows, setRows] = useState<InspectionQuestionResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getInspectionQuestionResults(inspectionId, section).then((data) => {
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, section]);

  const status = getSectionStatus(rows);
  const counts = getSectionCounts(rows);
  const label =
    section === "outer-packaging"
      ? "Outer"
      : section === "inner-packaging"
        ? "Inner"
        : "Product";

  return (
    <button
      type="button"
      onClick={() => onOpenDialog(inspectionId)}
      className="inline-flex items-center no-underline"
      title={`View ${label} checks`}
    >
      <span className="sr-only">{label} check status</span>
      {loading ? (
        <span className="text-muted-foreground text-xs">…</span>
      ) : status === null ? (
        <span className="text-muted-foreground text-xs">—</span>
      ) : (
        <>
          <Badge
            variant="success"
            className="rounded-r-none border-r-0 text-[10px]"
          >
            Pass {counts.passed}
          </Badge>
          <Badge
            variant="destructive"
            className="rounded-l-none border border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
          >
            Fail {counts.failed}
          </Badge>
        </>
      )}
    </button>
  );
}

const deviceColumn: ColumnDef<Inspection> = {
  id: "device",
  accessorKey: "device_fingerprint",
  header: ({ column }) => (
    <Button
      className="-ml-3"
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Device
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => (
    <Link
      to={PAGES.deviceViewPath(row.original.device_id)}
      className="text-primary hover:underline"
    >
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Smartphone className="h-3.5 w-3.5" />
        {row.original.device_fingerprint}
      </span>
    </Link>
  ),
};

export default function InspectionsDataTable({
  data,
  hideDeviceColumn = false,
  dateRange,
  onDateRangeChange,
  downloadCsvFileName,
  downloadCsv,
}: InspectionsDataTableProps) {
  const [checksDialogOpen, setChecksDialogOpen] = useState(false);
  const [checksDialogMode, setChecksDialogMode] = useState<"failed" | "passed">(
    "failed",
  );
  const [checksDialogLoading, setChecksDialogLoading] = useState(false);
  const [checksSectionRows, setChecksSectionRows] = useState<{
    outer: InspectionQuestionResult[];
    inner: InspectionQuestionResult[];
    product: InspectionQuestionResult[];
  }>({ outer: [], inner: [], product: [] });

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);

  const reviewCounts = useMemo(() => {
    const source = [
      ...checksSectionRows.outer,
      ...checksSectionRows.inner,
      ...checksSectionRows.product,
    ];
    const passed = source.filter((r) => r.status === "pass").length;
    const failed = source.filter((r) => r.status === "fail").length;
    return { passed, failed };
  }, [
    checksSectionRows.inner,
    checksSectionRows.outer,
    checksSectionRows.product,
  ]);

  const openChecksDialog = (inspectionId: string) => {
    setChecksDialogMode("failed");
    setChecksDialogOpen(true);
    setChecksDialogLoading(true);

    Promise.all([
      getInspectionQuestionResults(inspectionId, "outer-packaging"),
      getInspectionQuestionResults(inspectionId, "inner-packaging"),
      getInspectionQuestionResults(inspectionId, "product"),
    ])
      .then(([outer, inner, product]) => {
        setChecksSectionRows({ outer, inner, product });
      })
      .finally(() => {
        setChecksDialogLoading(false);
      });
  };

  const columns: ColumnDef<Inspection>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspection ID
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <InspectionIdLinkBadge id={row.original.id} />,
    },
    {
      accessorKey: "inspector_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspector
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          to={PAGES.userViewPath(row.original.inspector_id)}
          className="text-primary hover:underline"
        >
          {row.getValue("inspector_name")}
        </Link>
      ),
      filterFn: (row, _columnId, filterValue) =>
        row.getValue("inspector_name") === filterValue,
    },
    ...(hideDeviceColumn ? [] : [deviceColumn]),
    {
      accessorKey: "product_serial",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue("product_serial")}
        </span>
      ),
      filterFn: (row, _columnId, filterValue) =>
        row.getValue("product_serial") === filterValue,
    },
    {
      id: "outer_packaging",
      header: "Outer",
      cell: ({ row }) => (
        <SectionStatusCell
          key={`${row.original.id}-outer-packaging`}
          inspectionId={row.original.id}
          section="outer-packaging"
          onOpenDialog={openChecksDialog}
        />
      ),
    },
    {
      id: "inner_packaging",
      header: "Inner",
      cell: ({ row }) => (
        <SectionStatusCell
          key={`${row.original.id}-inner-packaging`}
          inspectionId={row.original.id}
          section="inner-packaging"
          onOpenDialog={openChecksDialog}
        />
      ),
    },
    {
      id: "product_checks",
      header: "Product",
      cell: ({ row }) => (
        <SectionStatusCell
          key={`${row.original.id}-product`}
          inspectionId={row.original.id}
          section="product"
          onOpenDialog={openChecksDialog}
        />
      ),
    },
    {
      accessorKey: "inspection_type",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <InspectionTypeBadge inspectionType={row.original.inspection_type} />
      ),
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("inspection_type") as string;
        if (filterValue === "inbound") return v === "inbound";
        if (filterValue === "outbound") return v === "outbound";
        return true;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={PAGES.inspectionViewPath(row.original.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View inspection
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: DataTableFilter<Inspection>[] = useMemo(() => {
    const inspectorOptions = Array.from(
      new Set(data.map((i) => i.inspector_name).filter(Boolean)),
    )
      .sort()
      .map((name) => ({ value: name, label: name }));
    const productOptions = Array.from(
      new Set(data.map((i) => i.product_serial).filter(Boolean)),
    )
      .sort()
      .map((serial) => ({ value: serial, label: serial }));
    return [
      {
        id: "inspection_type",
        title: "Type",
        options: [
          { value: "inbound", label: "Inbound" },
          { value: "outbound", label: "Outbound" },
        ],
      },
      ...(inspectorOptions.length > 0
        ? [
            {
              id: "inspector_name" as const,
              title: "Inspector",
              options: inspectorOptions,
            },
          ]
        : []),
      ...(productOptions.length > 0
        ? [
            {
              id: "product_serial" as const,
              title: "Product",
              options: productOptions,
            },
          ]
        : []),
    ];
  }, [data]);

  return (
    <>
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={galleryImages}
        activeUrl={activeGalleryUrl}
        onActiveUrlChange={setActiveGalleryUrl}
        title="Inspection images"
        description="Click a thumbnail to preview, or download the selected image."
      />

      <ChecksSummaryDialog
        open={checksDialogOpen}
        onOpenChange={setChecksDialogOpen}
        mode={checksDialogMode}
        onModeChange={setChecksDialogMode}
        reviewCounts={reviewCounts}
        sectionRows={checksSectionRows}
        onViewImages={(r) => {
          setGalleryImages(r.images);
          setActiveGalleryUrl(r.images[0]?.url ?? null);
          setGalleryOpen(true);
        }}
      />

      <div className={checksDialogLoading ? "opacity-100" : "opacity-100"}>
        <DataTable<Inspection>
          columns={columns}
          data={data}
          searchKey="product_serial"
          filters={filters}
          dateRangeFilter={{ dateAccessorKey: "created_at" }}
          showDateRangePicker={false}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          rangeLabel="inspections"
          downloadCsvFileName={downloadCsvFileName}
          downloadCsv={downloadCsv}
        />
      </div>
    </>
  );
}
