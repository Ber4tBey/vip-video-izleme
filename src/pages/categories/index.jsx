import { useState } from 'react';
import { Tag, Play } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';
import VideoCard from '../../components/ui/VideoCard';
import VideoPlayer from '../../components/ui/VideoPlayer';
import Pagination from '../../components/ui/Pagination';
import SEO from '../../components/SEO';
import { getMediaUrl } from '../../utils/api';

const CATS_PER_PAGE = 20;
const VIDEOS_PER_PAGE = 20;

const CategoriesPage = () => {
  const { activeCategories, activeVideos } = useVideo();
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [catPage, setCatPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);

  const catTotalPages = Math.ceil(activeCategories.length / CATS_PER_PAGE);
  const paginatedCats = activeCategories.slice(
    (catPage - 1) * CATS_PER_PAGE,
    catPage * CATS_PER_PAGE
  );

  const catVideos = selectedCat
    ? activeVideos.filter((v) => v.category_id === selectedCat.id)
    : [];
  const videoTotalPages = Math.ceil(catVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = catVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  const handleSelectCat = (cat) => {
    setSelectedCat(cat);
    setVideoPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      {selectedCat ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedCat(null); setVideoPage(1); }} className="btn-ghost text-sm">
              ← Geri
            </button>
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
                <VideoCard key={v.id} video={v} onClick={setSelectedVideo} />
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
          {activeCategories.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Tag size={40} className="mx-auto mb-4 opacity-30" />
              <p>Henüz kategori eklenmemiş.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedCats.map((cat, i) => {
                const count = activeVideos.filter((v) => v.category_id === cat.id).length;
                const globalIdx = activeCategories.indexOf(cat);
                const overlay = overlayColors[globalIdx % overlayColors.length];
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCat(cat)}
                    className="card overflow-hidden hover:-translate-y-1 transition-all duration-300 group relative aspect-video text-left"
                  >
                    {/* Arka plan resmi */}
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
                    {/* Koyu gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${overlay} to-transparent`} />
                    {/* İçerik */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                      <p className="font-bold text-white text-sm drop-shadow">{cat.name}</p>
                      <p className="text-xs text-white/70 mt-0.5">{count} video</p>
                    </div>
                  </button>
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

      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
    </>
  );
};

export default CategoriesPage;
