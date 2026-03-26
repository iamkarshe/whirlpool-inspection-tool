import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { DateRange } from "react-day-picker";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import {
  ImageGalleryDialog,
  type GalleryImage,
} from "@/components/image-gallery-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import {
  applyInspectionFilters,
  buildInspectionFilterSections,
  computeInspectionStatusMap,
  defaultInspectionFilters,
  mergeInspectionFilters,
  parseInspectionFiltersFromSearch,
  type InspectionStatusMap,
} from "@/pages/dashboard/inspections/components/inspection-filters";
import {
  getInspectionQuestionResults,
  getInspections,
  type Inspection,
  type InspectionQuestionResult,
  type InspectionSectionKey,
} from "@/pages/dashboard/inspections/inspection-service";

type FlaggedImageRow = {
  id: string;
  inspection_id: string;
  inspection_type: Inspection["inspection_type"];
  product_serial: string;
  inspector_name: string;
  section: InspectionSectionKey;
  question: string;
  created_at: string;
  image_url: string;
  image_filename?: string;
  images: GalleryImage[];
};

function sectionLabel(section: InspectionSectionKey) {
  if (section === "outer-packaging") return "Outer packaging";
  if (section === "inner-packaging") return "Inner packaging";
  if (section === "product") return "Product";
  return "Device";
}

export default function FlaggedImagesPage() {
  const location = useLocation();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filtersValue, setFiltersValue] = useState<Record<string, string[]>>({
    ...mergeInspectionFilters(
      { ...defaultInspectionFilters(), status: ["fail"] },
      parseInspectionFiltersFromSearch(location.search),
    ),
  });
  const [statusMap, setStatusMap] = useState<InspectionStatusMap | null>(null);
  const [rows, setRows] = useState<FlaggedImageRow[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));

    getInspections()
      .then(async (list) => {
        if (cancelled) return;
        setInspections(list);

        const map = await computeInspectionStatusMap(list);
        if (cancelled) return;
        setStatusMap(map);

        const failedInspections = list.filter((i) => map[i.id] === "fail");
        const sectionKeys: InspectionSectionKey[] = [
          "outer-packaging",
          "inner-packaging",
          "product",
        ];

        const perInspectionRows = await Promise.all(
          failedInspections.map(async (inspection) => {
            const sectionResults = await Promise.all(
              sectionKeys.map((section) =>
                getInspectionQuestionResults(inspection.id, section),
              ),
            );
            const failedQuestions = sectionResults
              .flat()
              .filter((q: InspectionQuestionResult) => q.status === "fail");

            return failedQuestions.flatMap((q) =>
              q.images.map((img, index) => ({
                id: `${inspection.id}-${q.id}-${index}`,
                inspection_id: inspection.id,
                inspection_type: inspection.inspection_type,
                product_serial: inspection.product_serial,
                inspector_name: inspection.inspector_name,
                section: q.section,
                question: q.question,
                created_at: inspection.created_at,
                image_url: img.url,
                image_filename: img.filename,
                images: q.images,
              })),
            );
          }),
        );

        if (!cancelled) setRows(perInspectionRows.flat());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filterSections = useMemo(
    () => buildInspectionFilterSections(inspections),
    [inspections],
  );

  const filteredInspections = useMemo(
    () => applyInspectionFilters(inspections, filtersValue, statusMap),
    [inspections, filtersValue, statusMap],
  );

  const filteredInspectionIds = useMemo(
    () => new Set(filteredInspections.map((i) => i.id)),
    [filteredInspections],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => filteredInspectionIds.has(r.inspection_id)),
    [rows, filteredInspectionIds],
  );

  const columns: ColumnDef<FlaggedImageRow>[] = [
    {
      accessorKey: "inspection_id",
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
      cell: ({ row }) => (
        <Link
          to={PAGES.inspectionViewPath(row.original.inspection_id)}
          className="font-mono text-primary hover:underline"
        >
          {row.original.inspection_id}
        </Link>
      ),
    },
    {
      accessorKey: "product_serial",
      header: "Product",
      cell: ({ row }) => <span className="font-mono">{row.original.product_serial}</span>,
    },
    {
      accessorKey: "inspector_name",
      header: "Inspector",
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => <Badge variant="secondary">{sectionLabel(row.original.section)}</Badge>,
    },
    {
      accessorKey: "question",
      header: "Failed check",
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[380px] text-sm">{row.original.question}</span>
      ),
    },
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <button
          type="button"
          className="overflow-hidden rounded-md border bg-muted/20"
          onClick={() => {
            setGalleryImages(row.original.images);
            setActiveGalleryUrl(row.original.image_url);
            setGalleryOpen(true);
          }}
        >
          <img
            src={row.original.image_url}
            alt={row.original.image_filename ?? "Flagged image"}
            className="h-12 w-16 object-cover"
          />
        </button>
      ),
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setGalleryImages(row.original.images);
            setActiveGalleryUrl(row.original.image_url);
            setGalleryOpen(true);
          }}
        >
          <span className="sr-only">View image</span>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter<FlaggedImageRow>[] = useMemo(() => {
    const sectionOptions = Array.from(new Set(filteredRows.map((r) => r.section))).map(
      (section) => ({ value: section, label: sectionLabel(section) }),
    );
    return [
      {
        id: "inspection_type",
        title: "Type",
        options: [
          { value: "inbound", label: "Inbound" },
          { value: "outbound", label: "Outbound" },
        ],
      },
      {
        id: "section",
        title: "Section",
        options: sectionOptions,
      },
    ];
  }, [filteredRows]);

  return (
    <>
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={galleryImages}
        activeUrl={activeGalleryUrl}
        onActiveUrlChange={setActiveGalleryUrl}
        title="Flagged image preview"
        description="Preview failed-check images and inspect details."
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageActionBar
            title="Flagged Images"
            description="All failed-check images across inspections. Click an image to open the viewer."
          />
          <div className="flex items-center gap-2">
            <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
            <MultiSelectFiltersDialog
              title="Filters"
              description="Refine flagged images by inspection filters."
              sections={filterSections}
              value={filtersValue}
              onApply={setFiltersValue}
              triggerLabel="Filters"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : (
          <DataTable<FlaggedImageRow>
            columns={columns}
            data={filteredRows}
            searchKey="product_serial"
            filters={filters}
            dateRangeFilter={{ dateAccessorKey: "created_at" }}
            showDateRangePicker={false}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            rangeLabel="flagged images"
          />
        )}
      </div>
    </>
  );
}
