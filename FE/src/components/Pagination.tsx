import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  totalItems?: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

function getVisiblePages(pageNumber: number, totalPages: number) {
  const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(pageNumber + 2, 5));

  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
    start + index,
  );
}

function Pagination({
  pageNumber,
  totalPages,
  totalItems,
  disabled = false,
  onPageChange,
}: PaginationProps) {
  if (!Number.isFinite(totalPages) || !Number.isFinite(pageNumber) || totalPages <= 1) return null;

  const pages = getVisiblePages(pageNumber, totalPages);

  return (
    <nav className="app-pagination" aria-label="Phân trang">
      {totalItems !== undefined && (
        <span className="app-pagination-total">{totalItems} kết quả</span>
      )}

      <div className="app-pagination-controls">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={disabled || pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        {pages[0] > 1 && <span>…</span>}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={page === pageNumber ? "is-active" : ""}
            aria-current={page === pageNumber ? "page" : undefined}
            disabled={disabled}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {pages.at(-1)! < totalPages && <span>…</span>}

        <button
          type="button"
          aria-label="Trang sau"
          disabled={disabled || pageNumber >= totalPages}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
