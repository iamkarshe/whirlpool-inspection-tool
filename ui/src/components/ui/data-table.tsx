import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Columns, Download, PlusCircle } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import { filterByCalendarDateRange } from "@/lib/date-range-filter";
import { downloadCsv as downloadCsvFile, toCsv } from "@/lib/csv";

export type DataTableFilterOption = {
  label: string;
  value: string;
};

export type DataTableFilter<TData> = {
  id: keyof TData & string;
  title: string;
  options: DataTableFilterOption[];
};

/** When set, the table shows CalendarDateRangePicker in the toolbar and filters rows by the selected range. */
export type DataTableDateRangeFilter<TData> = {
  /** Accessor key on TData that holds the date (ISO string or parseable date). */
  dateAccessorKey: keyof TData & string;
};

/**
 * Server-driven list: current page rows in `data`, totals and paging/sorting/search owned by parent.
 * Shared list helpers: `@/components/ui/data-table-server` (`sortingStateToApiSortQuery`, default page size, search debounce).
 */
export type DataTableServerSideConfig = {
  totalRowCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filters?: Record<string, string>;
  onFilterChange?: (id: string, value: string) => void;
};

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchKey?: keyof TData & string;
  filters?: DataTableFilter<TData>[];
  /** When set, enables the calendar date range picker in the toolbar and filters data by the selected range. */
  dateRangeFilter?: DataTableDateRangeFilter<TData>;
  /**
   * When true (default), show the date range picker in the toolbar.
   * When false, date range filtering can still be applied via controlled props.
   */
  showDateRangePicker?: boolean;
  /** Controlled date range (use with onDateRangeChange). */
  dateRange?: DateRange | undefined;
  /** Controlled date range setter (use with dateRange). */
  onDateRangeChange?: (range: DateRange | undefined) => void;
  /**
   * When true, show the selected-count footer text.
   * Most tables are read-only; keep this false unless you explicitly support selection.
   */
  allowSelection?: boolean;
  /**
   * Label used in selected-count footer text (e.g. "notifications", "products").
   * Defaults to "row(s)" when not provided.
   */
  selectionLabel?: string;
  /**
   * When `allowSelection` is false, the footer shows a pagination range label like:
   * "1 - 10 notifications". Defaults to "row(s)" when not provided.
   */
  rangeLabel?: string;
  /**
   * When provided, show a "Download CSV" button in the toolbar.
   * The export uses the table's current filtered/sorted rows (not just current page).
   */
  downloadCsvFileName?: string;
  /**
   * Provide headers and row mapping for CSV export.
   * Receives the currently filtered/sorted row originals.
   */
  downloadCsv?: (
    rows: TData[],
  ) => { headers: string[]; rows: Record<string, unknown>[] };
  /** When set, pagination/sorting/search are controlled by the parent (API-backed lists). */
  serverSide?: DataTableServerSideConfig;
  /**
   * When set with `serverSide`, the toolbar (search, columns, etc.) stays mounted.
   * The table body shows skeleton rows while empty, or a light overlay over rows while re-fetching.
   */
  isLoading?: boolean;
}

function formatColumnLabel(input: string) {
  const normalized = input
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return input;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  filters,
  dateRangeFilter,
  showDateRangePicker = true,
  dateRange: controlledDateRange,
  onDateRangeChange,
  allowSelection = false,
  selectionLabel,
  rangeLabel,
  downloadCsvFileName,
  downloadCsv,
  serverSide,
  isLoading = false,
}: DataTableProps<TData>) {
  const columnsStorageKey = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const scope = window.location.pathname;
    const label = (rangeLabel ?? "rows").toString();
    return `whirlpool.ui.datatable.columns.${scope}.${label}`;
  }, [rangeLabel]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  });

  const sortingState = serverSide ? serverSide.sorting : sorting;
  const setSortingState = serverSide
    ? serverSide.onSortingChange
    : setSorting;

  const paginationState = serverSide
    ? serverSide.pagination
    : pagination;
  const setPaginationState = serverSide
    ? serverSide.onPaginationChange
    : setPagination;
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      if (!columnsStorageKey) return {};
      try {
        const raw = window.localStorage.getItem(columnsStorageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          return parsed as VisibilityState;
        }
        return {};
      } catch {
        return {};
      }
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const isDateRangeControlled =
    controlledDateRange !== undefined && onDateRangeChange !== undefined;
  const [internalDateRange, setInternalDateRange] = React.useState<
    DateRange | undefined
  >(undefined);
  const dateRange = isDateRangeControlled ? controlledDateRange : internalDateRange;
  const setDateRange = React.useCallback(
    (next: DateRange | undefined) => {
      if (isDateRangeControlled) onDateRangeChange?.(next);
      else setInternalDateRange(next);
    },
    [isDateRangeControlled, onDateRangeChange],
  );

  const filteredData = React.useMemo(() => {
    if (!dateRangeFilter || !dateRange?.from) return data;
    return filterByCalendarDateRange(
      data,
      (row) => {
        const v = row[dateRangeFilter.dateAccessorKey];
        return v as string | Date | undefined | null;
      },
      dateRange,
    );
  }, [data, dateRange, dateRangeFilter]);

  const isServerSide = serverSide !== undefined;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      setSortingState(next);
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerSide
      ? {
          manualPagination: true,
          manualSorting: true,
          manualFiltering: true,
          pageCount: Math.max(
            1,
            Math.ceil(
              serverSide!.totalRowCount /
                Math.max(1, serverSide!.pagination.pageSize),
            ),
          ),
          rowCount: serverSide!.totalRowCount,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
        }),
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(paginationState) : updater;
      setPaginationState(next);
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (old: VisibilityState) => VisibilityState)(prev)
            : updater;
        if (columnsStorageKey) {
          try {
            window.localStorage.setItem(
              columnsStorageKey,
              JSON.stringify(next),
            );
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    onRowSelectionChange: setRowSelection,
    state: {
      sorting: sortingState,
      pagination: paginationState,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const serverLoading = isServerSide && isLoading;
  const skeletonRowCount = serverSide
    ? Math.min(Math.max(1, serverSide.pagination.pageSize), 50)
    : 8;

  const pageRangeText = React.useMemo(() => {
    if (serverSide) {
      const { totalRowCount, pagination: p } = serverSide;
      if (totalRowCount === 0) return `Showing 0 ${rangeLabel ?? "row(s)"}`;
      const start = p.pageIndex * p.pageSize + 1;
      const end = Math.min(totalRowCount, (p.pageIndex + 1) * p.pageSize);
      return `Showing ${start}–${end} of ${totalRowCount} ${rangeLabel ?? "row(s)"}`;
    }
    const total = table.getFilteredRowModel().rows.length;
    if (total === 0) return `Showing 0 ${rangeLabel ?? "row(s)"}`;

    const { pageIndex, pageSize } = table.getState().pagination;
    const start = pageIndex * pageSize + 1;
    const end = Math.min(total, (pageIndex + 1) * pageSize);
    return `Showing ${start}–${end} of ${total} ${rangeLabel ?? "row(s)"}`;
  }, [rangeLabel, serverSide, table]);

  return (
    <div className="rounded-lg border bg-background px-4 py-2 text-sm text-muted-foreground my-3">
      <div className="w-full">
        <div className="flex items-center gap-4 py-4">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
            {dateRangeFilter && showDateRangePicker ? (
              <CalendarDateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="shrink-0"
              />
            ) : null}
            {serverSide ? (
              <Input
                placeholder="Search..."
                value={serverSide.search}
                onChange={(event) => serverSide.onSearchChange(event.target.value)}
                className="max-w-xs"
              />
            ) : searchKey ? (
              <Input
                placeholder="Search..."
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="max-w-xs"
              />
            ) : null}

            {filters?.map((filter) => (
              <Popover key={filter.id}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    <PlusCircle className="mr-1 h-3 w-3" />
                    {filter.title}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-0">
                  <Command>
                    <CommandInput placeholder={filter.title} className="h-9" />
                    <CommandList>
                      <CommandEmpty>No options found.</CommandEmpty>
                      <CommandGroup>
                        {filter.options.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(value) => {
                              if (serverSide?.onFilterChange) {
                                const current =
                                  serverSide.filters?.[filter.id] ?? "";
                                serverSide.onFilterChange(
                                  filter.id,
                                  current === value ? "" : value,
                                );
                                return;
                              }
                              const column = table.getColumn(filter.id);
                              const current = column?.getFilterValue() as
                                | string
                                | undefined;
                              column?.setFilterValue(current === value ? "" : value);
                            }}
                          >
                            <div className="flex items-center space-x-3 py-1">
                              <Checkbox
                                checked={
                                  serverSide
                                    ? (serverSide.filters?.[filter.id] ?? "") ===
                                      option.value
                                    : (table
                                        .getColumn(filter.id)
                                        ?.getFilterValue() as
                                        | string
                                        | undefined) === option.value
                                }
                                aria-label={option.label}
                              />
                              <span className="leading-none">
                                {option.label}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ))}
          </div>

          {downloadCsvFileName && downloadCsv ? (
            <Button
              variant="outline"
              onClick={() => {
                const rows = table.getSortedRowModel().rows.map((r) => r.original as TData);
                const { headers, rows: mapped } = downloadCsv(rows);
                const csv = toCsv(mapped, headers);
                downloadCsvFile(downloadCsvFileName, csv);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Columns /> <span className="hidden md:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className=""
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}
                  >
                    {formatColumnLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          className="relative rounded-md border"
          aria-busy={serverLoading || undefined}
        >
          {serverLoading && filteredData.length > 0 ? (
            <div
              className="bg-background/45 pointer-events-auto absolute inset-0 z-[1] cursor-wait"
              aria-hidden
            />
          ) : null}
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {serverLoading && !filteredData.length ? (
                Array.from({ length: skeletonRowCount }, (_, i) => {
                  const headerGroup = table.getHeaderGroups()[0];
                  const headers = headerGroup?.headers ?? [];
                  return (
                    <TableRow key={`loading-${i}`}>
                      {headers.length > 0
                        ? headers.map((header) => (
                            <TableCell key={header.id}>
                              <Skeleton className="h-5 max-w-[160px]" />
                            </TableCell>
                          ))
                        : columns.map((col, j) => (
                            <TableCell key={`${String(col.id ?? j)}-${j}`}>
                              <Skeleton className="h-5 max-w-[160px]" />
                            </TableCell>
                          ))}
                    </TableRow>
                  );
                })
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-4">
          {allowSelection ? (
            <div className="text-muted-foreground flex-1 text-sm">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length}{" "}
              {selectionLabel ?? "row(s)"} selected.
            </div>
          ) : (
            <div className="text-muted-foreground flex-1 text-xs">
              {pageRangeText}
            </div>
          )}
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || serverLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || serverLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
