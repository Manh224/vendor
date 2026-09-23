"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-sm text-[#6B6B6B]">
        Trang {page} / {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-sm text-[#6B6B6B] hover:text-[#00321B] hover:bg-[#067643]/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-[#6B6B6B] text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                p === page
                  ? "bg-[#067643]/10 text-[#067643]"
                  : "text-[#6B6B6B] hover:text-[#00321B] hover:bg-[#067643]/5"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg text-sm text-[#6B6B6B] hover:text-[#00321B] hover:bg-[#067643]/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
}
