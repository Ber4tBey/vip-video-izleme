import { useState } from 'react';
import { Crown, Play, TrendingUp, Eye, ChevronRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';
import VideoCard from '../../components/ui/VideoCard';
import VideoPlayer from '../../components/ui/VideoPlayer';
import AdBanner from '../../components/ui/AdBanner';
import SEO from '../../components/SEO';

const HomePage = () => {
  const { activeVideos, trendingVideos } = useVideo();
  const { isVIP, isAdmin } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState(null);

  const freeVideos = activeVideos.filter((v) => !v.is_vip).slice(0, 8);
  const topTrending = trendingVideos.slice(0, 6);

  return (
    <>
      <SEO 
        title="Ana Sayfa" 
        description="En kaliteli VIP porno, türk ifşa ve sex videoları platformu."
      />
      <div className="space-y-10 animate-fade-in">
        {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-dark-700 via-dark-800 to-dark-900 border border-dark-500 p-8 md:p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500 via-transparent to-transparent" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-vip text-sm px-3 py-1">
              <Crown size={14} />
              Premium İçerik Platformu
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            Sınırsız <span className="text-primary-400">VIP</span> İçerik<br />
            Deneyimi
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            En kaliteli +18 içeriklere özel platformumuzda erişin. VIP üyeliğinizle tüm içerikler sizin için.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/videos" className="btn-primary text-base px-6 py-3">
              <Play size={18} />
              Videoları İzle
            </Link>
            {!isVIP && !isAdmin && (
              <Link to="/vip" className="btn-vip text-base px-6 py-3 animate-pulse-gold">
                <Crown size={18} />
                VIP Ol
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4">
          {[
            { label: 'Aktif Video', value: `${activeVideos.length}+` },
            { label: 'Toplam İzlenme', value: `${(activeVideos.reduce((a, b) => a + (b.view_count || 0), 0) / 1000).toFixed(1)}K` },
            { label: 'VIP İçerik', value: `${activeVideos.filter(v => v.is_vip).length}+` },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reklam — Leaderboard (Hero altı) */}
      <AdBanner slotId="home-leaderboard" size="leaderboard" />

      {/* Trending */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title mb-0">
            <Flame size={24} className="text-primary-500" />
            Trend Videolar
          </h2>
          <Link to="/trends" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {topTrending.map((video) => (
            <VideoCard key={video.id} video={video} onClick={setSelectedVideo} />
          ))}
        </div>
      </section>

      {/* Reklam — Rectangle (Bölümler arası) */}
      <div className="flex justify-center">
        <AdBanner slotId="home-rectangle" size="rectangle" />
      </div>

      {/* Free Videos */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title mb-0">
            <Play size={22} className="text-primary-500" />
            Ücretsiz Videolar
          </h2>
          <Link to="/videos" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
            Tümünü Gör <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {freeVideos.map((video) => (
            <VideoCard key={video.id} video={video} onClick={setSelectedVideo} />
          ))}
        </div>
      </section>

      {/* Reklam — Banner (İçerik sonu) */}
      <AdBanner slotId="home-banner" size="banner" />

      {/* VIP CTA */}
      {!isVIP && !isAdmin && (
        <div className="card p-8 text-center border-vip-gold/30 bg-gradient-to-br from-dark-700 to-dark-800">
          <Crown size={40} className="text-vip-gold mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">VIP İçeriklere Erişin</h3>
          <p className="text-gray-400 mb-6">Özel VIP videolara sınırsız erişim için VIP üyeliği edinin.</p>
          
        </div>
      )}

      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
    </>
  );
};

export default HomePage;
