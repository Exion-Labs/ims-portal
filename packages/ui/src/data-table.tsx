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
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [showColumnChooser, setShowColumnChooser] = useState(false);

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
    <div className="rounded-[12px] border border-[var(--border-subtle),#E4E4E7] bg-white">
      {(onSearchChange || filterChips || onExportCsv || rightActions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle),#E4E4E7] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {onSearchChange && (
              <input
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-64 rounded-[8px] border border-[var(--border-subtle),#E4E4E7] bg-[var(--bg-canvas),#F7F7F8] px-3 text-[13px] text-[var(--text-primary),#18181B] placeholder:text-[var(--text-muted),#63636B] focus:border-[var(--brand-primary),#1D4ED8] focus:bg-white focus:outline-hidden"
              />
            )}
            {filterChips}
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowColumnChooser((v) => !v)}
              aria-label="Choose columns"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle),#E4E4E7] bg-white px-3 text-[13px] font-medium text-[var(--text-primary),#18181B] hover:bg-[var(--bg-canvas),#F7F7F8]"
            >
              <SlidersHorizontal className="h-4 w-4 text-[var(--text-secondary),#52525B]" />
              <span>Columns</span>
            </button>

            {showColumnChooser && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-[12px] border border-[var(--border-subtle),#E4E4E7] bg-white p-2 shadow-lg">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted),#63636B]">
                  Visible Columns
                </div>
                {table
                  .getAllLeafColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-[var(--text-primary),#18181B] hover:bg-[var(--bg-canvas),#F7F7F8]"
                    >
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="rounded border-[var(--border-subtle),#E4E4E7]"
                      />
                      <span className="truncate">{col.id}</span>
                    </label>
                  ))}
              </div>
            )}

            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle),#E4E4E7] bg-white px-3 text-[13px] font-medium text-[var(--text-primary),#18181B] hover:bg-[var(--bg-canvas),#F7F7F8]"
              >
                <Download className="h-4 w-4 text-[var(--text-secondary),#52525B]" />
                <span>Export</span>
              </button>
            )}
            {rightActions}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[var(--border-subtle),#E4E4E7] bg-[var(--bg-canvas),#F7F7F8]">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-4 py-2.5 text-[12px] font-semibold text-[var(--text-secondary),#52525B]"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-[var(--text-primary),#18181B]"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[var(--brand-primary),#1D4ED8]" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 text-[var(--brand-primary),#1D4ED8]" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted),#63636B]/60" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle),#E4E4E7]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-[var(--border-subtle),#E4E4E7]/70" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors hover:bg-[var(--bg-canvas),#F7F7F8]/70",
                    row.getIsSelected() && "bg-[var(--brand-tint),#EEF2FF]/60"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-2.5 text-[var(--text-primary),#18181B]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange !== undefined && pageIndex !== undefined && totalCount !== undefined && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle),#E4E4E7] px-4 py-2.5 text-[12px] text-[var(--text-secondary),#52525B]">
          <div>
            Showing{" "}
            <span className="font-mono font-medium text-[var(--text-primary),#18181B]">
              {totalCount === 0 ? 0 : pageIndex * pageSize + 1}
            </span>{" "}
            –{" "}
            <span className="font-mono font-medium text-[var(--text-primary),#18181B]">
              {Math.min((pageIndex + 1) * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-mono font-medium text-[var(--text-primary),#18181B]">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => onPageChange(pageIndex - 1)}
              className="inline-flex h-7 items-center gap-1 rounded bg-white px-2.5 text-[12px] font-medium text-[var(--text-primary),#18181B] hover:bg-[var(--bg-canvas),#F7F7F8] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={(pageIndex + 1) * pageSize >= totalCount}
              onClick={() => onPageChange(pageIndex + 1)}
              className="inline-flex h-7 items-center gap-1 rounded bg-white px-2.5 text-[12px] font-medium text-[var(--text-primary),#18181B] hover:bg-[var(--bg-canvas),#F7F7F8] disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
