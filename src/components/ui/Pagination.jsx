import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Görüntülenecek sayfa numaraları (en fazla 5 tane, ortada mevcut sayfa)
  const getPages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
      {/* Önceki */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
      >
        <ChevronLeft size={15} />
        <span className="hidden sm:inline">Önceki</span>
      </button>

      {/* Sayfa numaraları */}
      {getPages().map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} className="px-2 py-2 text-gray-600 text-sm select-none">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
              currentPage === page
                ? 'bg-primary-700 text-white shadow-lg shadow-primary-900/40'
                : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500'
            }`}
          >
            {page}
          </button>
        )
      )}

      {/* Sonraki */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
      >
        <span className="hidden sm:inline">Sonraki</span>
        <ChevronRight size={15} />
      </button>
    </div>
  );
};

export default Pagination;
