import { useState } from 'react';
import { TrendingUp, Eye, Flame, Trophy, Lock, Play, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useSettings } from '../../context/SettingsContext';
import VideoCard from '../../components/ui/VideoCard';
import VideoThumbnail from '../../components/ui/VideoThumbnail';
import Pagination from '../../components/ui/Pagination';
import SEO from '../../components/SEO';
import { slugify } from '../../utils/slugify';
import { getMediaUrl, getSecureVideoUrl } from '../../utils/api';

const PER_PAGE = 20;

const TrendsPage = () => {
  const { trendingVideos } = useVideo();
  const { isVIP, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [page, setPage] = useState(1);

  const top3 = trendingVideos.slice(0, 3);
  const rest = trendingVideos.slice(3);

  const totalPages = Math.ceil(rest.length / PER_PAGE);
  const paginatedRest = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
  const rankBg = [
    'bg-yellow-400/10 border-yellow-400/30',
    'bg-gray-400/10 border-gray-400/30',
    'bg-amber-700/10 border-amber-700/30',
  ];

  return (
    <>
      <SEO 
        title="Trend Videolar — En Çok İzlenen Porno ve İfşalar"
        description="En çok izlenen vip porno, türk ifşa ve sex videoları. Trend olan en ateşli içerikleri keşfet."
      />
      <div className="space-y-8">
        <h1 className="section-title">
          <TrendingUp size={24} className="text-primary-500" />
        Trendler
        <span className="ml-2 text-sm font-normal text-gray-500">İzlenme sayısına göre sıralanmıştır</span>
      </h1>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {top3.map((video, idx) => {
            const canWatch = !video.is_vip || isVIP || isAdmin;
            const tgLink = settings?.telegramLink || 'https://t.me/yourusername';
            const inner = (
              <div
                className={`card relative border ${rankBg[idx]} p-4 hover:-translate-y-1 transition-all duration-300 block group ${!canWatch ? 'opacity-90' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${rankBg[idx]}`}>
                    {idx === 0 ? (
                      <Trophy size={16} className={rankColors[0]} />
                    ) : (
                      <span className={`font-black text-sm ${rankColors[idx]}`}>#{idx + 1}</span>
                    )}
                  </div>
                  <span className={`font-bold text-sm ${rankColors[idx]}`}>
                    {idx === 0 ? 'En Çok İzlenen' : idx === 1 ? '2. Sıra' : '3. Sıra'}
                  </span>
                </div>
                <div className="aspect-video relative rounded-lg overflow-hidden mb-3 bg-dark-600">
                  <VideoThumbnail
                    thumbnail={getMediaUrl(video.thumbnail_url)}
                    videoSrc={canWatch ? getSecureVideoUrl(video.url) : ''}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                  {/* VIP overlay if locked */}
                  {!canWatch && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-20">
                      <div className="w-12 h-12 rounded-full bg-vip-gold/20 border-2 border-vip-gold flex items-center justify-center">
                        <Lock size={20} className="text-vip-gold" />
                      </div>
                      <span className="text-vip-gold font-bold text-sm">VIP İçerik</span>
                    </div>
                  )}

                  {/* Play overlay on hover */}
                  {canWatch && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-300 z-20">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5 z-30">
                    {video.is_vip && (
                      <span className="badge-vip"><Crown size={10} />VIP</span>
                    )}
                  </div>
                </div>
                <p className="font-semibold text-white text-sm truncate group-hover:text-primary-400 transition-colors">{video.title}</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <Eye size={12} className="text-primary-400" />
                  <span>{(video.view_count).toLocaleString('tr-TR')} izlenme</span>
                </div>
              </div>
            );

            return !canWatch ? (
              <a key={video.id} href={tgLink} target="_blank" rel="noopener noreferrer" className="block">
                {inner}
              </a>
            ) : (
              <Link key={video.id} to={`/video/${slugify(video.title)}`} className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {/* Rest — paginated */}
      {rest.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame size={18} className="text-primary-500" />
            Diğer Trendler
            {totalPages > 1 && (
              <span className="text-sm font-normal text-gray-500 ml-1">
                · Sayfa {page}/{totalPages}
              </span>
            )}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedRest.map((video, idx) => (
              <div key={video.id} className="relative">
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-dark-800/90 border border-dark-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">
                    #{(page - 1) * PER_PAGE + idx + 4}
                  </span>
                </div>
                <VideoCard video={video} showViewCount={true} />
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </div>
      )}

      {trendingVideos.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <TrendingUp size={40} className="mx-auto mb-4 opacity-30" />
          <p>Henüz trend veri yok.</p>
        </div>
      )}
    </div>
    </>
  );
};

export default TrendsPage;
