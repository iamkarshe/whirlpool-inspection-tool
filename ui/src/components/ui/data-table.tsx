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
import { filterByCalendarDateRange } from "@/lib/date-range-filter";
import type {
  ColumnDef,
  ColumnFiltersState,
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
import { Columns, PlusCircle } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

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

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchKey?: keyof TData & string;
  filters?: DataTableFilter<TData>[];
  /** When set, enables the calendar date range picker in the toolbar and filters data by the selected range. */
  dateRangeFilter?: DataTableDateRangeFilter<TData>;
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  filters,
  dateRangeFilter,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="rounded-lg border bg-background px-4 py-2 text-sm text-muted-foreground my-3">
      <div className="w-full">
        <div className="flex items-center gap-4 py-4">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
            {dateRangeFilter ? (
              <CalendarDateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="shrink-0"
              />
            ) : null}
            {searchKey ? (
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
                              const column = table.getColumn(filter.id);
                              const current = column?.getFilterValue() as
                                | string
                                | undefined;
                              column?.setFilterValue(
                                current === value ? "" : value,
                              );
                            }}
                          >
                            <div className="flex items-center space-x-3 py-1">
                              <Checkbox
                                checked={
                                  (table
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
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-md border">
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
              {table.getRowModel().rows?.length ? (
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
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
