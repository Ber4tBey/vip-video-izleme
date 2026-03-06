import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import Pagination from '../../components/ui/Pagination';
import AdBanner from '../../components/ui/AdBanner';
import SEO from '../../components/SEO';
import api from '../../utils/api';

const PER_PAGE = 20;

const VideosPage = () => {
  const { activeCategories, activeModels } = useVideo();
  const [searchParams] = useSearchParams();

  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const debounceRef = useRef(null);

  const fetchVideos = useCallback(async (p, search, category, model, type) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: PER_PAGE });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (model) params.set('model', model);
      if (type === 'vip') params.set('vip', '1');
      else if (type === 'free') params.set('vip', '0');

      const data = await api.get(`/videos?${params.toString()}`);
      setVideos(data.videos || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when page/filters change
  useEffect(() => {
    fetchVideos(page, searchTerm, selectedCategory, selectedModel, typeFilter);
  }, [page, selectedCategory, selectedModel, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchVideos(1, value, selectedCategory, selectedModel, typeFilter);
    }, 400);
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedModel('');
    setTypeFilter('all');
    setPage(1);
    fetchVideos(1, '', '', '', 'all');
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Video ara..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
            className="input-field w-auto text-sm"
          >
            <option value="">Tüm Kategoriler</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => handleFilterChange(setSelectedModel, e.target.value)}
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
                onClick={() => handleFilterChange(setTypeFilter, val)}
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
          {total} video bulundu
          {totalPages > 1 && ` · Sayfa ${page}/${totalPages}`}
        </p>
      </div>

      {/* Reklam — filtre altı */}
      <AdBanner slotId="videos-leaderboard" size="leaderboard" />

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p>Filtrelerinize uygun video bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((video) => (
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
