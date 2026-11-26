"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "./utils";
import { EmptyState } from "./primitives";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { Skeleton } from "./components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filterChips?: React.ReactNode;
  onExportCsv?: () => void;
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (rows: TData[]) => void;
  rightActions?: React.ReactNode;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (pageIndex: number) => void;
  renderMobileCard?: (
    row: TData,
    meta: { isSelected: boolean; toggleSelected: () => void }
  ) => React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  emptyTitle = "No records found",
  emptyDescription = "Adjust your search or filters to find what you're looking for.",
  searchPlaceholder = "Filter rows…",
  searchValue,
  onSearchChange,
  filterChips,
  onExportCsv,
  enableRowSelection = false,
  onSelectedRowsChange,
  rightActions,
  pageIndex,
  pageSize = 25,
  totalCount,
  onPageChange,
  renderMobileCard,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectedRowsChange) {
        const selected = Object.keys(next)
          .filter((k) => next[k])
          .map((idx) => data[Number(idx)])
          .filter((item): item is TData => item !== undefined);
        onSelectedRowsChange(selected);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-[12px] border border-border bg-card">
      {(onSearchChange || filterChips || onExportCsv || rightActions) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {onSearchChange && (
              <Input
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-background focus-visible:bg-card sm:w-64"
              />
            )}
            {filterChips}
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Choose columns"
                  className={renderMobileCard ? "hidden md:inline-flex" : undefined}
                >
                  <SlidersHorizontal className="size-4 text-muted-foreground" />
                  <span>Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={(checked) => col.toggleVisibility(Boolean(checked))}
                    >
                      <span className="truncate">{col.id}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {onExportCsv && (
              <Button type="button" variant="outline" onClick={onExportCsv}>
                <Download className="size-4 text-muted-foreground" />
                <span>Export</span>
              </Button>
            )}
            {rightActions}
          </div>
        </div>
      )}

      {renderMobileCard && (
        <div className="divide-y divide-border md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2 p-3.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="p-4">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
          ) : (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className={cn("p-3.5", row.getIsSelected() && "bg-accent/60")}
              >
                {renderMobileCard(row.original, {
                  isSelected: row.getIsSelected(),
                  toggleSelected: () => row.toggleSelected(),
                })}
              </div>
            ))
          )}
        </div>
      )}

      <div className={renderMobileCard ? "hidden md:block" : undefined}>
        <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <TableRow key={rIdx} className="hover:bg-transparent">
                {columns.map((_, cIdx) => (
                  <TableCell key={cIdx}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-6">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(row.getIsSelected() && "bg-accent/60")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {onPageChange !== undefined && pageIndex !== undefined && totalCount !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-[12px] text-muted-foreground sm:px-4">
          <div>
            Showing{" "}
            <span className="font-mono font-medium text-foreground">
              {totalCount === 0 ? 0 : pageIndex * pageSize + 1}
            </span>{" "}
            –{" "}
            <span className="font-mono font-medium text-foreground">
              {Math.min((pageIndex + 1) * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-mono font-medium text-foreground">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={pageIndex <= 0}
              onClick={() => onPageChange(pageIndex - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={(pageIndex + 1) * pageSize >= totalCount}
              onClick={() => onPageChange(pageIndex + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
