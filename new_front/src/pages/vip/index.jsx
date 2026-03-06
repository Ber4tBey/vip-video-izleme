import { Crown } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';
import { VIPRoute } from '../../components/auth/ProtectedRoute';
import VideoCard from '../../components/ui/VideoCard';
import SEO from '../../components/SEO';

const VIPPage = () => {
  const { activeVideos } = useVideo();
  const vipVideos = activeVideos.filter((v) => v.is_vip);

  return (
    <VIPRoute>
      <SEO title="VIP İçerikler — Özel Porno ve İfşa Videoları" noindex={true} />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-vip-gold/10 border border-vip-gold/30 flex items-center justify-center">
            <Crown size={24} className="text-vip-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">VIP Üyelere Özel</h1>
            <p className="text-gray-500 text-sm">{vipVideos.length} özel içerik</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-vip-gold/40 via-vip-gold/10 to-transparent" />

        {vipVideos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Crown size={40} className="mx-auto mb-4 opacity-30" />
            <p>Henüz VIP içerik eklenmemiş.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {vipVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}

      </div>
    </VIPRoute>
  );
};

export default VIPPage;
