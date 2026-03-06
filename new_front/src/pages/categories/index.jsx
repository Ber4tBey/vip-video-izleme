import { useState, useEffect, useCallback, useRef } from 'react';
import { Tag, Play, Search } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import Pagination from '../../components/ui/Pagination';
import SEO from '../../components/SEO';
import { getMediaUrl } from '../../utils/api';
import api from '../../utils/api';

const CATS_PER_PAGE = 20;
const VIDEOS_PER_PAGE = 20;

const CategoriesPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { activeVideos } = useVideo();

  // List state
  const [categories, setCategories] = useState([]);
  const [catTotal, setCatTotal] = useState(0);
  const [catTotalPages, setCatTotalPages] = useState(0);
  const [catPage, setCatPage] = useState(1);
  const [catLoading, setCatLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef(null);

  // Detail state
  const [selectedCat, setSelectedCat] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [videoPage, setVideoPage] = useState(1);

  // Fetch category list
  const fetchCategories = useCallback(async (page, search) => {
    setCatLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: CATS_PER_PAGE });
      if (search) params.set('search', search);
      const data = await api.get(`/categories?${params.toString()}`);
      setCategories(data.categories || []);
      setCatTotal(data.total || 0);
      setCatTotalPages(data.totalPages || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // Fetch single category by slug
  useEffect(() => {
    if (slug) {
      setDetailLoading(true);
      api.get(`/categories/${slug}`)
        .then((cat) => { setSelectedCat(cat); setVideoPage(1); })
        .catch(() => { setSelectedCat(null); navigate('/categories', { replace: true }); })
        .finally(() => setDetailLoading(false));
    } else {
      setSelectedCat(null);
      fetchCategories(catPage, searchTerm);
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch list when page changes (only in list mode)
  useEffect(() => {
    if (!slug) fetchCategories(catPage, searchTerm);
  }, [catPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCatPage(1);
      fetchCategories(1, value);
    }, 400);
  };

  // Videos for selected category
  const catVideos = selectedCat
    ? activeVideos.filter((v) => v.category_id === selectedCat.id)
    : [];
  const videoTotalPages = Math.ceil(catVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = catVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  const overlayColors = [
    'from-primary-900/70', 'from-purple-900/70', 'from-emerald-900/70',
    'from-amber-900/70', 'from-rose-900/70', 'from-cyan-900/70',
  ];

  return (
    <>
      <SEO 
        title={selectedCat ? `${selectedCat.name} Videoları — Porno İzle` : "Porno Kategorileri — VIP Sex ve İfşa"}
        description={selectedCat ? `${selectedCat.name} kategorisindeki en iyi pornolar, ifşa ve sex videoları.` : "Tüm kategoriler, türk ifşa, hd porno ve sex arşivleri."}
        keywords={selectedCat ? `${selectedCat.name}, ${selectedCat.name} porno, ${selectedCat.name} izle, türk ifşa, sex` : "porno kategorileri, ifşa kanalları, hd porno"}
      />
      <div className="space-y-6">
        <h1 className="section-title">
          <Tag size={24} className="text-primary-500" />
        Kategoriler
      </h1>

      {detailLoading ? (
        <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
      ) : selectedCat ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Link to="/categories" className="btn-ghost text-sm">
              ← Geri
            </Link>
            <div className="flex items-center gap-3">
              {selectedCat.image_url && (
                <img
                  src={getMediaUrl(selectedCat.image_url)}
                  alt={selectedCat.name}
                  loading="lazy"
                  decoding="async"
                  className="w-10 h-10 rounded-lg object-cover border border-dark-500"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCat.name}</h2>
                <p className="text-gray-500 text-xs">{catVideos.length} video</p>
              </div>
            </div>
          </div>

          {paginatedVideos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Play size={40} className="mx-auto mb-4 opacity-30" />
              <p>Bu kategoride video bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={videoPage}
            totalPages={videoTotalPages}
            onPageChange={(p) => { setVideoPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Kategori ara..."
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
              <span className="text-xs text-gray-500">
                {catTotal} kategori{searchTerm && ' bulundu'}
              </span>
            </div>
          </div>

          {catLoading ? (
            <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Tag size={40} className="mx-auto mb-4 opacity-30" />
              <p>{searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz kategori eklenmemiş.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((cat, i) => {
                const count = activeVideos.filter((v) => v.category_id === cat.id).length;
                const overlay = overlayColors[i % overlayColors.length];
                return (
                  <Link
                    key={cat.id}
                    to={`/categories/${cat.slug}`}
                    className="card overflow-hidden hover:-translate-y-1 transition-all duration-300 group relative aspect-video text-left block"
                  >
                    {cat.image_url ? (
                      <img
                        src={getMediaUrl(cat.image_url)}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${overlay.replace('/70', '/40')} to-dark-900`} />
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t ${overlay} to-transparent`} />
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                      <p className="font-bold text-white text-sm drop-shadow">{cat.name}</p>
                      <p className="text-xs text-white/70 mt-0.5">{count} video</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={catPage}
            totalPages={catTotalPages}
            onPageChange={(p) => { setCatPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </>
      )}
    </div>
    </>
  );
};

export default CategoriesPage;
