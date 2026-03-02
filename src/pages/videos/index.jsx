import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import Pagination from '../../components/ui/Pagination';
import AdBanner from '../../components/ui/AdBanner';
import SEO from '../../components/SEO';

const PER_PAGE = 20;

const VideosPage = () => {
  const { activeVideos, activeCategories, activeModels } = useVideo();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return activeVideos.filter((v) => {
      const matchSearch = !searchTerm || v.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !selectedCategory || v.categoryId === selectedCategory;
      const matchModel = !selectedModel || v.modelId === selectedModel;
      const matchType =
        typeFilter === 'all' ? true : typeFilter === 'vip' ? v.is_vip : !v.is_vip;
      return matchSearch && matchCat && matchModel && matchType;
    });
  }, [activeVideos, searchTerm, selectedCategory, selectedModel, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleFilterChange = (cb) => {
    cb();
    setPage(1); // filtre değişince 1. sayfaya dön
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedModel('');
    setTypeFilter('all');
    setPage(1);
  };

  const hasFilters = searchTerm || selectedCategory || selectedModel || typeFilter !== 'all';

  return (
    <>
      <SEO 
        title="Tüm Videolar — Türk İfşa ve VIP Porno İzle"
        description="En yeni türk ifşa, porno ve sikiş videolarını full hd izle."
      />
      <div className="space-y-6">
        <h1 className="section-title">
          <SlidersHorizontal size={24} className="text-primary-500" />
        Tüm Videolar
      </h1>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleFilterChange(() => setSearchTerm(e.target.value))}
              placeholder="Video ara..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => handleFilterChange(() => setSelectedCategory(e.target.value))}
            className="input-field w-auto text-sm"
          >
            <option value="">Tüm Kategoriler</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => handleFilterChange(() => setSelectedModel(e.target.value))}
            className="input-field w-auto text-sm"
          >
            <option value="">Tüm Modeller</option>
            {activeModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="flex rounded-lg overflow-hidden border border-dark-400">
            {[['all', 'Tümü'], ['free', 'Ücretsiz'], ['vip', 'VIP']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => handleFilterChange(() => setTypeFilter(val))}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  typeFilter === val
                    ? 'bg-primary-700 text-white'
                    : 'bg-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-sm py-2">
              <X size={14} />
              Temizle
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {filtered.length} video bulundu
          {totalPages > 1 && ` · Sayfa ${page}/${totalPages}`}
        </p>
      </div>

      {/* Reklam — filtre altı */}
      <AdBanner slotId="videos-leaderboard" size="leaderboard" />

      {/* Grid */}
      {paginated.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p>Filtrelerinize uygun video bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginated.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </div>
    </>
  );
};

export default VideosPage;
