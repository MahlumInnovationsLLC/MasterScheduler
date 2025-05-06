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

  const table = useReactTable({
    data,
    columns,
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
    <div className="bg-darkCard rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="font-bold text-lg">
          {table.getFilteredRowModel().rows.length} Results
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="bg-darkInput text-gray-300 border-none rounded-lg px-4 py-2 pl-9 text-sm focus:ring-1 focus:ring-primary"
            />
            <div className="absolute left-3 top-2.5 text-gray-500">
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
              <SelectTrigger className="bg-darkInput text-gray-300 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary">
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
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <Table className="w-full min-w-max">
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => {
                const isColumnFrozen = frozenColumns.includes(header.column.id);
                // Calculate left position for frozen columns
                let leftPosition = 0;
                if (isColumnFrozen) {
                  const frozenIndex = frozenColumns.indexOf(header.column.id);
                  for (let i = 0; i < frozenIndex; i++) {
                    const prevColumnId = frozenColumns[i];
                    const headerGroup = table.getHeaderGroups()[0];
                    const prevHeader = headerGroup.headers.find(h => h.column.id === prevColumnId);
                    leftPosition += prevHeader ? (prevHeader.getSize() || 150) : 150;
                  }
                }
                
                return (
                  <TableHead 
                    key={header.id}
                    className={`px-4 py-3 bg-gray-900 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
                      isColumnFrozen ? 'sticky z-20' : ''
                    } ${isColumnFrozen && frozenColumns.indexOf(header.column.id) === frozenColumns.length - 1 ? 'after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-primary/30 after:content-[""]' : ''}`}
                    style={{
                      minWidth: header.getSize() || 150,
                      width: header.getSize() || 150,
                      position: isColumnFrozen ? 'sticky' : undefined,
                      left: isColumnFrozen ? `${leftPosition}px` : undefined,
                      boxShadow: isColumnFrozen ? '2px 0 4px rgba(0,0,0,0.15)' : undefined,
                      backgroundColor: isColumnFrozen ? '#1a1b26' : undefined,
                      zIndex: isColumnFrozen ? 30 : undefined
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
                  className="border-b border-gray-800 hover:bg-gray-900/50"
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
                        className={`px-4 py-4 ${
                          isColumnFrozen ? 'sticky z-10' : ''
                        } ${isColumnFrozen && frozenColumns.indexOf(cell.column.id) === frozenColumns.length - 1 ? 'after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-primary/30 after:content-[""]' : ''}`}
                        style={{
                          minWidth: cell.column.getSize() || 150,
                          width: cell.column.getSize() || 150,
                          position: isColumnFrozen ? 'sticky' : undefined,
                          left: isColumnFrozen ? `${leftPosition}px` : undefined,
                          boxShadow: isColumnFrozen ? '2px 0 4px rgba(0,0,0,0.15)' : undefined,
                          backgroundColor: isColumnFrozen ? '#1e1e2e' : undefined,
                          zIndex: isColumnFrozen ? 20 : undefined
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
                  className="h-24 text-center text-gray-500"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-800">
          <div className="text-sm text-gray-400">
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