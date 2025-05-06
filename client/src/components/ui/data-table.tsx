"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterOptions?: { value: string; label: string }[];
  searchPlaceholder?: string;
  showPagination?: boolean;
  frozenColumns?: string[]; // Names of column IDs to freeze
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterOptions,
  searchPlaceholder = "Search...",
  showPagination = true,
  frozenColumns = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // Remove 'timeline' column if it exists
  const filteredColumns = columns.filter(col => col.id !== 'timeline');

  const table = useReactTable({
    data,
    columns: filteredColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 1000, // Set a very large page size to show all rows
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  // Define column widths
  const columnWidths = {
    location: 80,
    projectNumber: 100,
    name: 200,
    pmOwner: 130,
    progress: 120,
    status: 100,
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-bold text-lg">
          {table.getFilteredRowModel().rows.length} Results
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="bg-input border-none rounded-lg px-4 py-2 pl-9 text-sm focus:ring-1 focus:ring-primary"
            />
            <div className="absolute left-3 top-2.5 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            </div>
          </div>
          
          {filterColumn && filterOptions && (
            <Select
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onValueChange={(value) => {
                table.getColumn(filterColumn)?.setFilterValue(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="bg-input border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      
      <div className="overflow-hidden">
        {/* Combined table container for alignment */}
        <div className="overflow-x-auto" style={{ position: 'relative' }}>
          <div className="relative flex" style={{ width: 'fit-content' }}>
            {/* Frozen columns - these will stay fixed */}
            <div 
              className="sticky left-0 z-40 shadow-md"
              style={{ 
                background: 'var(--background)',
                borderRight: '2px solid var(--primary)'
              }}
            >
              <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-muted/50">
                    {table.getHeaderGroups()[0].headers.map((header) => {
                      if (frozenColumns.includes(header.column.id)) {
                        const width = columnWidths[header.column.id as keyof typeof columnWidths] || 150;
                        return (
                          <th 
                            key={header.id}
                            className="px-4 py-3 font-semibold text-left"
                            style={{ 
                              width: `${width}px`, 
                              minWidth: `${width}px`,
                              height: '52px', // Fixed height for header
                              background: 'var(--muted)',
                              borderBottom: '1px solid var(--border)'
                            }}
                          >
                            <div
                              className={
                                header.column.getCanSort()
                                  ? 'flex items-center gap-1 cursor-pointer select-none'
                                  : ''
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <div className="inline-block">
                                  {{
                                    asc: <ChevronUp className="h-4 w-4" />,
                                    desc: <ChevronDown className="h-4 w-4" />,
                                    false: <ChevronsUpDown className="h-4 w-4 opacity-50" />,
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      }
                      return null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {table.getFilteredRowModel().rows.length > 0 ? ( // Show all filtered rows instead of paginated rows
                    table.getFilteredRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/50 border-b border-border"
                        style={{ height: '52px' }} // Fixed height for rows
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (frozenColumns.includes(cell.column.id)) {
                            const width = columnWidths[cell.column.id as keyof typeof columnWidths] || 150;
                            return (
                              <td 
                                key={cell.id}
                                className="px-4 py-3"
                                style={{ 
                                  width: `${width}px`, 
                                  minWidth: `${width}px`,
                                  background: 'var(--background)',
                                  borderRight: '1px solid var(--border-muted)'
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={frozenColumns.length}
                        className="h-24 text-center"
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Scrollable columns */}
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-muted/50">
                    {table.getHeaderGroups()[0].headers.map((header) => {
                      if (!frozenColumns.includes(header.column.id)) {
                        return (
                          <th 
                            key={header.id}
                            className="px-4 py-3 font-semibold text-left whitespace-nowrap"
                            style={{ 
                              minWidth: '150px',
                              height: '52px', // Fixed height for header
                              background: 'var(--muted)',
                              borderBottom: '1px solid var(--border)',
                              borderRight: '1px solid var(--border-muted)'
                            }}
                          >
                            <div
                              className={
                                header.column.getCanSort()
                                  ? 'flex items-center gap-1 cursor-pointer select-none'
                                  : ''
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <div className="inline-block">
                                  {{
                                    asc: <ChevronUp className="h-4 w-4" />,
                                    desc: <ChevronDown className="h-4 w-4" />,
                                    false: <ChevronsUpDown className="h-4 w-4 opacity-50" />,
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      }
                      return null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {table.getFilteredRowModel().rows.length > 0 ? ( // Show all filtered rows instead of paginated rows
                    table.getFilteredRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/50 border-b border-border"
                        style={{ height: '52px' }} // Fixed height for rows
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (!frozenColumns.includes(cell.column.id)) {
                            return (
                              <td 
                                key={cell.id}
                                className="px-4 py-3 whitespace-nowrap"
                                style={{ 
                                  minWidth: '150px',
                                  borderRight: '1px solid var(--border-muted)'
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length - frozenColumns.length}
                        className="h-24 text-center"
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-3 flex items-center justify-between border-t border-border">
        <div className="text-sm text-muted-foreground">
          Showing all {table.getFilteredRowModel().rows.length} entries
        </div>
      </div>
    </div>
  );
}