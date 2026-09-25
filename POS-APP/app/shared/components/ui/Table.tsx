import type { JSX, ReactNode } from "react";
import { Button } from "./Button";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  sortBy,
  sortDir = "asc",
  onSort,
  page = 1,
  pageSize = 20,
  total,
  onPageChange,
  emptyMessage = "No data",
  loading = false,
  rowKey,
  onRowClick,
}: Props<T>): JSX.Element {
  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortable && onSort
                      ? sortBy === col.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex min-h-10 items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      {col.header}
                      {sortBy === col.key && (
                        <span aria-hidden data-testid={sortDir === "asc" ? "sort-asc" : "sort-desc"}>
                          {sortDir === "asc" ? (
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="size-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--color-text-muted)]">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} role={onRowClick ? "button" : undefined} className={onRowClick ? "hover:bg-[var(--color-surface)] cursor-pointer" : ""} onClick={() => onRowClick?.(row)} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); } } : undefined}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {(total && total > pageSize) && (
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}>Prev</Button>
            <Button variant="ghost" size="sm" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}