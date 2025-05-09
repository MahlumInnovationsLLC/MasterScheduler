import React, { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesDeal } from "@shared/schema";
import { formatCurrency } from "@/lib/formatters";
import { getDealStageColor, getPriorityColor } from "@/lib/deal-colors";
import { useLocation } from "wouter";
import { Edit, Trash2 } from "lucide-react";

interface SalesDealsTableProps {
  deals: SalesDeal[];
  onDelete?: (id: number) => void;
}

export function SalesDealsTable({ deals, onDelete }: SalesDealsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [, navigate] = useLocation();

  const columns = useMemo<ColumnDef<SalesDeal>[]>(() => [
    {
      accessorKey: "id",
      header: () => <div className="sr-only">ID</div>,
      cell: ({ row }) => (
        <div className="w-[30px]">
          <input type="checkbox" className="rounded border-gray-300" />
        </div>
      ),
    },
    {
      accessorKey: "dealNumber",
      header: "Project",
      cell: ({ row }) => (
        <div className="flex items-start">
          <div className="font-medium">{row.original.dealNumber}</div>
          <div className="ml-1 text-sm text-muted-foreground">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => <div>{row.original.clientName}</div>,
    },
    {
      accessorKey: "dealType",
      header: "Deal Type",
      cell: ({ row }) => (
        <div className="text-sm capitalize">
          {row.original.dealType.replace(/_/g, " ")}
        </div>
      ),
    },
    {
      accessorKey: "ownerName",
      header: "Deal Owner",
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary/10 mr-2 flex items-center justify-center text-primary font-semibold">
            {row.original.ownerName.split(" ").map(n => n[0]).join("")}
          </div>
          <div>{row.original.ownerName}</div>
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: "$ Value",
      cell: ({ row }) => (
        <div className="font-mono font-medium">
          {formatCurrency(row.original.value)}
        </div>
      ),
    },
    {
      accessorKey: "dealStage",
      header: "Deal Stage",
      cell: ({ row }) => {
        const stage = row.original.dealStage;
        const color = getDealStageColor(stage);
        return (
          <Badge variant="outline" className={`${color} capitalize`}>
            {stage.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const stage = row.original.dealStage;
        let status = "On Hold";
        
        if (stage === "site_core_activity" || stage === "project_launch" || stage === "submit_decide") {
          status = "In Progress";
        } else if (stage === "not_started") {
          status = "Not Started";
        }
        
        return <div className="text-sm">{status}</div>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => <div>N/A</div>,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.original.priority;
        const color = getPriorityColor(priority);
        
        return (
          <Badge className={color}>
            {priority === "urgent" ? "LATE" : priority === "high" ? "HIGH" : "N/A"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "vertical",
      header: "Vertical",
      cell: ({ row }) => <div>{row.original.vertical}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
            onClick={() => navigate(`/sales-deal/${row.original.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
              onClick={() => onDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [navigate, onDelete]);

  const table = useReactTable({
    data: deals,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
                        header.getContext()
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No deals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}