import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";

export interface BooksPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

function visiblePages(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const candidates = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...candidates].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

export function BooksPagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: BooksPaginationProps) {
  const t = useT();
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  const pages = visiblePages(current, totalPages);
  const atFirst = current <= 1;
  const atLast = current >= totalPages;

  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("pagination.showing", { from, to, total })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onPageSizeChange && pageSizeOptions && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-9 w-[150px]" aria-label={t("pagination.perPageLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("pagination.perPage", { count: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <nav aria-label={t("pagination.label")} className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={atFirst}
            onClick={() => onPageChange(1)}
            aria-label={t("pagination.first")}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={atFirst}
            onClick={() => onPageChange(current - 1)}
            aria-label={t("pagination.previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="px-2 text-sm text-muted-foreground"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === current ? "outline" : "ghost"}
                size="icon"
                onClick={() => onPageChange(p)}
                aria-current={p === current ? "page" : undefined}
                aria-label={t("pagination.page", { page: p })}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={atLast}
            onClick={() => onPageChange(current + 1)}
            aria-label={t("pagination.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={atLast}
            onClick={() => onPageChange(totalPages)}
            aria-label={t("pagination.last")}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
