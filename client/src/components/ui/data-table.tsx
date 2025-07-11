"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Download,
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
  enableSorting?: boolean; // Control whether sorting is enabled
  persistenceKey?: string; // Unique key for persisting pagination state
  initialSorting?: SortingState; // Initial sorting configuration
  onExportExcel?: () => void; // Optional export function
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterOptions,
  searchPlaceholder = "Search...",
  showPagination = true,
  frozenColumns = [],
  enableSorting = true,
  persistenceKey,
  initialSorting = [],
  onExportExcel,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  // Initialize pageIndex with saved value immediately
  const getInitialPageIndex = () => {
    if (persistenceKey && typeof window !== 'undefined') {
      // For delivered projects, always start at page 1 on fresh page loads
      if (persistenceKey === 'delivered-projects') {
        console.log("🔄 PAGINATION: Delivered projects - starting at page 1 on fresh load");
        return 0;
      }

      const saved = localStorage.getItem(`datatable-page-${persistenceKey}`);
      if (saved) {
        try {
          const savedPage = parseInt(saved, 10);
          if (!isNaN(savedPage) && savedPage >= 0) {
            console.log("🔄 PAGINATION: Initializing with saved page", savedPage, "for key", persistenceKey);
            return savedPage;
          }
        } catch (e) {
          // Ignore invalid saved data
        }
      }
    }
    return 0;
  };

  const [pageIndex, setPageIndex] = useState<number>(getInitialPageIndex);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Debug logging for pagination changes
  useEffect(() => {
    console.log("🔄 PAGINATION: Current pageIndex state:", pageIndex);
  }, [pageIndex]);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, []);

  // Save pagination state when it changes
  useEffect(() => {
    if (persistenceKey && typeof window !== 'undefined') {
      localStorage.setItem(`datatable-page-${persistenceKey}`, pageIndex.toString());
    }
  }, [pageIndex, persistenceKey]);

  // Focus-preserving global filter handler
  const handleGlobalFilterChange = useCallback((value: string) => {
    setGlobalFilter(value);
    // Preserve focus after state update
    setTimeout(() => {
      if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  }, []);

  // Modify the columns to always enable sorting for all columns
  const columnsWithSorting = React.useMemo(() => {
    return columns.map(column => ({
      ...column,
      // Always enable sorting for all columns
      enableSorting: true,
    }));
  }, [columns]);

  // Remove 'timeline' column if it exists
  const filteredColumns = columnsWithSorting.filter(col => col.id !== 'timeline');

  // Custom global filter function for enhanced text searching
  const globalFilterFn = React.useCallback((row: any, columnId: string, value: string) => {
    if (!value) return true;
    
    const searchValue = value.toLowerCase().trim();
    
    // Search fields for Projects module
    const projectFields = ['projectNumber', 'pmOwner', 'location', 'name', 'status'];
    
    // Search fields for Billing Milestones module
    const billingFields = ['projectNumber', 'projectName', 'pmOwner', 'location', 'name', 'status'];
    
    // Combine all potential search fields
    const allSearchFields = [...new Set([...projectFields, ...billingFields])];
    
    // Search across all possible table columns
    for (const field of allSearchFields) {
      try {
        const fieldValue = row.getValue(field);
        if (fieldValue && typeof fieldValue === 'string') {
          if (fieldValue.toLowerCase().includes(searchValue)) {
            return true;
          }
        }
      } catch (error) {
        // Column doesn't exist, skip it
        continue;
      }
    }
    
    // Search in original row data for all other fields
    const original = row.original;
    if (original) {
      // Define all searchable fields from the original data
      const searchableFields = [
        'name',           // Project name
        'description',    // Project description  
        'customer',       // Customer name
        'team',          // Team assignment
        'notes',         // Project notes
        'status',        // Project status
        'assignedTo',    // Assigned person
        'department'     // Department
      ];
      
      for (const field of searchableFields) {
        const fieldValue = original[field];
        if (fieldValue && typeof fieldValue === 'string') {
          if (fieldValue.toLowerCase().includes(searchValue)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, []);

  const table = useReactTable({
    data,
    columns: filteredColumns,
    getCoreRowModel: getCoreRowModel(),
    // Custom sorting to move N/A values to the bottom
    getSortedRowModel: getSortedRowModel(),
    sortingFns: {
      customSort: (rowA, rowB, columnId) => {
        // ALWAYS ensure delivered projects go to the bottom regardless of column
        const statusA = rowA.original?.status;
        const statusB = rowB.original?.status;

        const isADelivered = statusA === 'delivered';
        const isBDelivered = statusB === 'delivered';

        if (isADelivered && !isBDelivered) return 1;  // A goes to bottom
        if (!isADelivered && isBDelivered) return -1; // B goes to bottom

        // If both or neither are delivered, proceed with normal sorting
        let valueA = rowA.getValue(columnId) as string | number | Date | null | undefined;
        let valueB = rowB.getValue(columnId) as string | number | Date | null | undefined;

        // Handle N/A values
        const isANA = valueA === 'N/A' || valueA === null || valueA === undefined || valueA === '';
        const isBNA = valueB === 'N/A' || valueB === null || valueB === undefined || valueB === '';

        // N/A values go to the bottom (but after delivered projects)
        if (isANA && !isBNA) return 1;
        if (!isANA && isBNA) return -1;
        if (isANA && isBNA) return 0;

        // Date comparison
        if (valueA instanceof Date && valueB instanceof Date) {
          return valueA.getTime() - valueB.getTime();
        }

        // Regular string comparison for non-empty values
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return valueA.localeCompare(valueB);
        }

        // Numeric comparison
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return valueA - valueB;
        }

        // Fallback for mixed types - convert to strings and compare
        const strA = String(valueA);
        const strB = String(valueB);
        return strA.localeCompare(strB);
      },
      statusSort: (rowA, rowB, columnId) => {
        // ALWAYS ensure delivered projects go to the bottom regardless of sorting
        const statusA = rowA.original?.status;
        const statusB = rowB.original?.status;

        const isADelivered = statusA === 'delivered';
        const isBDelivered = statusB === 'delivered';

        if (isADelivered && !isBDelivered) return 1;  // A goes to bottom
        if (!isADelivered && isBDelivered) return -1; // B goes to bottom

        // If both or neither are delivered, sort by issue priority
        if (!isADelivered && !isBDelivered) {
          const priorityA = rowA.original?.issuePriority || 0;
          const priorityB = rowB.original?.issuePriority || 0;
          
          // Higher priority (higher number) comes first
          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }
        }

        return 0;
      }
    },
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: globalFilterFn,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      console.log("🔄 PAGINATION: onPaginationChange called with:", updater);
      if (typeof updater === 'function') {
        const currentPagination = { pageIndex, pageSize: 10 };
        const newPagination = updater(currentPagination);
        console.log("🔄 PAGINATION: Function updater - from", currentPagination, "to", newPagination);

        setPageIndex(newPagination.pageIndex);
      } else {
        console.log("🔄 PAGINATION: Direct updater - setting pageIndex to", updater.pageIndex);
        setPageIndex(updater.pageIndex);
      }
    },
    // Prevent automatic pagination reset on data changes
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: { pageIndex, pageSize: 10 },
    },
  });

  // Define column widths
  const columnWidths = {
    location: 96, // Increased by 20%
    projectNumber: 220, // Already adjusted for text wrapping
    name: 420, // Increased by 20%
    pmOwner: 120, // Reduced from 156 to make room for wider status column
    progress: 144, // Increased by 20%
    status: 200, // Increased from 120 to 200 for horizontal badge layout
    actions: 120, // Added actions column width
    notes: 360, // Expanded Notes column to 3x previous width (120px * 3)
  };

  // Fixed row height for all rows
  const ROW_HEIGHT = '60px';

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">
            {table.getFilteredRowModel().rows.length} Results
          </h2>
          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              className="ml-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          )}
          {/* Extra slot for custom filter buttons - will be used by ProjectStatus page */}
          <div id="custom-filter-buttons"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => handleGlobalFilterChange(e.target.value)}
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
        <div style={{ position: 'relative' }}>
          <div className="grid grid-flow-col" style={{ width: 'fit-content', alignItems: 'stretch' }}>
            {/* Frozen columns - these will stay fixed */}
            <div 
              className="sticky left-0 z-40 shadow-md"
              style={{ 
                display: 'flex',
                background: 'var(--background)',
                borderRight: '2px solid var(--primary)',
                boxSizing: 'border-box'
              }}
            >
              <table className="border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    {table.getHeaderGroups()[0].headers.map((header) => {
                      if (frozenColumns.includes(header.column.id)) {
                        const width = columnWidths[header.column.id as keyof typeof columnWidths] || 150;
                        return (
                          <th 
                            key={header.id}
                            className="px-4 font-semibold text-left whitespace-nowrap"
                            style={{ 
                              width: `${width}px`, 
                              minWidth: `${width}px`,
                              background: 'var(--muted)',
                              borderBottom: '1px solid var(--border)',
                              height: '50px',
                              paddingTop: '15px',
                              paddingBottom: '15px'
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
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-border transition-colors duration-150"
                        style={{ height: ROW_HEIGHT }} // Explicitly set height for all rows
                        onMouseEnter={() => {
                          // Highlight corresponding row in scrollable section
                          const scrollableRow = document.querySelector(`[data-row-id="scrollable-${row.id}"]`);
                          if (scrollableRow) {
                            scrollableRow.classList.add('bg-gray-100', 'dark:bg-gray-800');
                          }
                        }}
                        onMouseLeave={() => {
                          // Remove highlight from corresponding row in scrollable section
                          const scrollableRow = document.querySelector(`[data-row-id="scrollable-${row.id}"]`);
                          if (scrollableRow) {
                            scrollableRow.classList.remove('bg-gray-100', 'dark:bg-gray-800');
                          }
                        }}
                        data-row-id={row.id}
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (frozenColumns.includes(cell.column.id)) {
                            const width = columnWidths[cell.column.id as keyof typeof columnWidths] || 150;
                            return (
                              <td 
                                key={cell.id}
                                className="px-4 align-middle"
                                style={{ 
                                  width: `${width}px`, 
                                  minWidth: `${width}px`,
                                  background: 'var(--background)',
                                  borderRight: '1px solid var(--border-muted)',
                                  height: ROW_HEIGHT,
                                  padding: '0 16px' // Consistent padding
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

            {/* Scrollable columns with fixed row heights */}
            <div 
              className="overflow-x-auto"
              style={{
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE and Edge */
              }}
              onScroll={(e) => {
                // Sync scroll with external scrollbar
                const scrollLeft = e.currentTarget.scrollLeft;

                // Find the external scrollbar more reliably
                const mainContainer = e.currentTarget.closest('div[class="overflow-hidden"]') as HTMLElement;
                const externalScrollbar = mainContainer?.parentElement?.querySelector('div.overflow-x-auto.mt-0') as HTMLElement;

                if (externalScrollbar) {
                  externalScrollbar.scrollLeft = scrollLeft;
                }
              }}
            >
              <style>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <table className="border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    {table.getHeaderGroups()[0].headers.map((header) => {
                      if (!frozenColumns.includes(header.column.id)) {
                        let headerText = flexRender(header.column.columnDef.header, header.getContext());
                        // Conditionally change headers (assuming you have access to header.column.id)
                        if (header.column.id === 'mechShop') {
                            headerText = 'MECH Shop';
                        } else if (header.column.id === 'fabricationStart') {
                            headerText = 'FAB Start';
                        } else if (header.column.id === 'ntcTestingDays') {
                            headerText = 'NTC Days';
                        } else if (header.column.id === 'meAssigned') {
                            headerText = 'ME';
                        } else if (header.column.id === 'eeAssigned') {
                            headerText = 'EE';
                        } else if (header.column.id === 'iteAssigned') {
                            headerText = 'ITE';
                        } else if (header.column.id === 'meDesignOrdersPercent') {
                            headerText = 'ME %';
                        } else if (header.column.id === 'eeDesignOrdersPercent') {
                            headerText = 'EE %';
                        } else if (header.column.id === 'itDesignOrdersPercent') {
                            headerText = 'IT %';
                        } else if (header.column.id === 'ntcDesignOrdersPercent') {
                            headerText = 'NTC %';
                        } else if (header.column.id === 'contractDate') {
                            headerText = 'Contract Date';
                        }
                        return (
                          <th 
                            key={header.id}
                            className="px-4 font-semibold text-left whitespace-nowrap"
                            style={{ 
                              minWidth: columnWidths[header.column.id as keyof typeof columnWidths] 
                                ? `${columnWidths[header.column.id as keyof typeof columnWidths]}px`
                                : typeof header.column.columnDef.size === 'number' 
                                  ? `${Math.round(header.column.columnDef.size * 1.2)}px` // Increase by 20%
                                : header.column.columnDef.size || '180px', // Default size increased by 20%
                              width: typeof header.column.columnDef.size === 'number'
                                ? `${Math.round(header.column.columnDef.size * 1.2)}px` // Increase by 20%
                                : header.column.columnDef.size || '180px', // Default size increased by 20%
                              background: 'var(--muted)',
                              borderBottom: '1px solid var(--border)',
                              borderRight: '1px solid var(--border-muted)',
                              height: '50px',
                              paddingTop: '15px',
                              paddingBottom: '15px'
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
                              {headerText}
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
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        data-row-id={`scrollable-${row.id}`}
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-border transition-colors duration-150"
                        style={{ height: ROW_HEIGHT }} // Explicitly set height for all rows
                        onMouseEnter={() => {
                          // Highlight corresponding row in frozen section
                          const frozenRows = document.querySelectorAll(`tr[data-row-id="${row.id}"]`);
                          frozenRows.forEach(frozenRow => {
                            frozenRow.classList.add('bg-gray-100', 'dark:bg-gray-800');
                          });
                        }}
                        onMouseLeave={() => {
                          // Remove highlight from corresponding row in frozen section
                          const frozenRows = document.querySelectorAll(`tr[data-row-id="${row.id}"]`);
                          frozenRows.forEach(frozenRow => {
                            frozenRow.classList.remove('bg-gray-100', 'dark:bg-gray-800');
                          });
                        }}
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (!frozenColumns.includes(cell.column.id)) {
                            return (
                              <td 
                                key={cell.id}
                                className={`px-4 align-middle ${cell.column.id === 'notes' ? '' : 'whitespace-nowrap'}`}
                                style={{ 
                                  minWidth: columnWidths[cell.column.id as keyof typeof columnWidths] 
                                    ? `${columnWidths[cell.column.id as keyof typeof columnWidths]}px`
                                    : typeof cell.column.columnDef.size === 'number' 
                                      ? `${Math.round(cell.column.columnDef.size * 1.2)}px` // Increase by 20%
                                      : cell.column.columnDef.size || '180px', // Default size increased by 20%
                                  width: columnWidths[cell.column.id as keyof typeof columnWidths] 
                                    ? `${columnWidths[cell.column.id as keyof typeof columnWidths]}px`
                                    : typeof cell.column.columnDef.size === 'number'
                                      ? `${Math.round(cell.column.columnDef.size * 1.2)}px` // Increase by 20%
                                      : cell.column.columnDef.size || '180px', // Default size increased by 20%
                                  borderRight: '1px solid var(--border-muted)',
                                  height: ROW_HEIGHT
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
          {/* External scrollbar positioned below both table sections */}
          <div 
            className="overflow-x-auto mt-0 border-t border-border bg-muted/20" 
            style={{ 
              height: '15px',
              width: '100%',
              scrollbarWidth: 'thin', /* Firefox */
              scrollbarColor: 'var(--border) var(--muted)', /* Firefox */
            }}
            ref={(el) => {
              if (el) {
                // Calculate the actual scrollable width by finding the scrollable table
                const updateScrollbarWidth = () => {
                  const mainContainer = el.parentElement as HTMLElement;
                  const gridContainer = mainContainer?.querySelector('div[style*="position: relative"] > div.grid') as HTMLElement;
                  const scrollableTable = gridContainer?.querySelector('div.overflow-x-auto') as HTMLElement;
                  const innerTable = scrollableTable?.querySelector('table') as HTMLElement;

                  if (innerTable && el.firstElementChild) {
                    // Add extra padding to ensure the actions column is fully visible
                    // Use a larger buffer to account for the actions column width
                    const actualWidth = innerTable.scrollWidth + 60; // Increased buffer to 60px
                    (el.firstElementChild as HTMLElement).style.width = `${actualWidth}px`;
                  }
                };

                // Update width after component mounts and data loads
                setTimeout(updateScrollbarWidth, 100);
                // Add a second check after a longer delay to catch late-loading content
                setTimeout(updateScrollbarWidth, 500);

                // Update on window resize
                const resizeObserver = new ResizeObserver(updateScrollbarWidth);
                const mainContainer = el.parentElement as HTMLElement;
                if (mainContainer) {
                  resizeObserver.observe(mainContainer);
                }

                // Also observe the inner table for content changes
                if (mainContainer) {
                  const gridContainer = mainContainer.querySelector('div[style*="position: relative"] > div.grid') as HTMLElement;
                  const scrollableTable = gridContainer?.querySelector('div.overflow-x-auto') as HTMLElement;
                  const innerTable = scrollableTable?.querySelector('table') as HTMLElement;
                  if (innerTable) {
                    resizeObserver.observe(innerTable);
                  }
                }
              }
            }}
            onScroll={(e) => {
              // Sync scroll with the scrollable table content
              const scrollLeft = e.currentTarget.scrollLeft;

              // Find the scrollable table element more reliably
              const mainContainer = e.currentTarget.parentElement as HTMLElement;
              const gridContainer = mainContainer?.querySelector('div[style*="position: relative"] > div.grid') as HTMLElement;
              const scrollableTable = gridContainer?.querySelector('div.overflow-x-auto') as HTMLElement;

              if (scrollableTable) {
                scrollableTable.scrollLeft = scrollLeft;
              }
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                height: 12px;
              }
              div::-webkit-scrollbar-track {
                background: var(--muted);
                border-radius: 6px;
              }
              div::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 6px;
                border: 2px solid var(--muted);
              }
              div::-webkit-scrollbar-thumb:hover {
                background: var(--foreground);
              }
            `}</style>
            <div style={{ 
              height: '1px', 
              width: `${(columns.length - frozenColumns.length) * 220}px` // Initial width, will be updated dynamically
            }}></div>
          </div>
        </div>
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