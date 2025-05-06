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
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

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
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {table.getHeaderGroups()[0].headers.map((header) => {
                const isColumnFrozen = frozenColumns.includes(header.column.id);
                
                // Calculate left position for frozen columns
                let leftPosition = 0;
                if (isColumnFrozen) {
                  const frozenIndex = frozenColumns.indexOf(header.column.id);
                  for (let i = 0; i < frozenIndex; i++) {
                    const prevColumnId = frozenColumns[i];
                    const prevHeader = table.getHeaderGroups()[0].headers.find(h => h.column.id === prevColumnId);
                    leftPosition += prevHeader ? (prevHeader.getSize() || 150) : 150;
                  }
                }
                
                return (
                  <TableHead 
                    key={header.id}
                    style={{
                      position: isColumnFrozen ? 'sticky' : 'relative',
                      left: isColumnFrozen ? `${leftPosition}px` : 'auto',
                      zIndex: isColumnFrozen ? 10 : 'auto',
                      background: isColumnFrozen ? 'var(--background)' : 'transparent',
                      borderRight: isColumnFrozen && frozenColumns.indexOf(header.column.id) === frozenColumns.length - 1 
                        ? '2px solid var(--primary)' 
                        : 'none',
                      boxShadow: isColumnFrozen && frozenColumns.indexOf(header.column.id) === frozenColumns.length - 1 
                        ? '4px 0 8px rgba(0,0,0,0.15)' 
                        : 'none',
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
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isColumnFrozen = frozenColumns.includes(cell.column.id);
                    
                    // Calculate left position for frozen columns
                    let leftPosition = 0;
                    if (isColumnFrozen) {
                      const frozenIndex = frozenColumns.indexOf(cell.column.id);
                      for (let i = 0; i < frozenIndex; i++) {
                        const prevColumnId = frozenColumns[i];
                        const prevCell = row.getVisibleCells().find(c => c.column.id === prevColumnId);
                        leftPosition += prevCell ? (prevCell.column.getSize() || 150) : 150;
                      }
                    }
                    
                    return (
                      <TableCell 
                        key={cell.id}
                        style={{
                          position: isColumnFrozen ? 'sticky' : 'relative',
                          left: isColumnFrozen ? `${leftPosition}px` : 'auto',
                          zIndex: isColumnFrozen ? 1 : 'auto',
                          background: isColumnFrozen ? 'var(--background)' : 'transparent',
                          borderRight: isColumnFrozen && frozenColumns.indexOf(cell.column.id) === frozenColumns.length - 1 
                            ? '2px solid var(--primary)' 
                            : 'none',
                          boxShadow: isColumnFrozen && frozenColumns.indexOf(cell.column.id) === frozenColumns.length - 1 
                            ? '4px 0 8px rgba(0,0,0,0.15)' 
                            : 'none',
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of <span className="font-medium">{table.getFilteredRowModel().rows.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={!table.getCanPreviousPage() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
              const pageIndex = i + Math.max(0, Math.min(
                table.getState().pagination.pageIndex - 2,
                table.getPageCount() - 5
              ));
              
              return (
                <Button
                  key={pageIndex}
                  variant={pageIndex === table.getState().pagination.pageIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => table.setPageIndex(pageIndex)}
                >
                  {pageIndex + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={!table.getCanNextPage() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}