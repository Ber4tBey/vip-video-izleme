import { useParams, useNavigate, Link } from 'react-router-dom';
import { Crown, Send, ArrowLeft, Eye, Lock, Tag, Users } from 'lucide-react';
import SEO from '../../components/SEO';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { matchSlug } from '../../utils/slugify';
import { getMediaUrl, getSecureVideoUrl } from '../../utils/api';

const VideoPage = () => {
  const { slug } = useParams();
  const { activeVideos, incrementViewCount } = useVideo();
  const { isVIP, isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const video = activeVideos.find((v) => matchSlug(v, slug));

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-gray-500 text-lg mb-4">Video bulunamadı.</p>
        <Link to="/videos" className="btn-ghost text-sm">← Videolara dön</Link>
      </div>
    );
  }

  const canWatch = !video.is_vip || isVIP || isAdmin;
  const tgLink = settings.telegramLink || 'https://t.me/yourusername';

  // Increment view count on first render
  if (canWatch) {
    // Using a ref to track if counted — done via VideoContext during play
  }

  const siteUrl = window.location.origin;
  const pageUrl = window.location.href;

  return (
    <>
      <SEO 
        title={`${video.title} — VIP İfşa ve Porno`}
        description={video.description || `${video.title} ifşa ve sex videoları full HD kalitede.`}
        keywords={`${video.model_name || ''}, ${video.category_name || ''}, türk ifşa, porno izle, hd sex, leak`}
        noindex={video.is_vip}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
          <ArrowLeft size={15} />
          Geri
        </button>

        {/* Player / Gate */}
        {canWatch ? (
          <div className="rounded-2xl overflow-hidden bg-black shadow-2xl aspect-video">
            <video
              src={getSecureVideoUrl(video.url)}
              controls
              autoPlay
              className="w-full h-full"
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onPlay={() => incrementViewCount?.(video.id)}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-700 border border-dark-500 aspect-video flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-vip-gold/10 border-2 border-vip-gold flex items-center justify-center">
              <Lock size={32} className="text-vip-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">VIP İçerik</h2>
              <p className="text-gray-400 max-w-md">
                Bu videoyu izlemek için VIP üyelik gereklidir.
              </p>
            </div>
            <a
              href={tgLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-vip text-base px-8 py-3"
            >
              <Send size={16} />
              Telegram'dan VIP Üyelik Al
            </a>
          </div>
        )}

        {/* Meta info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">{video.title}</h1>
              {video.description && (
                <p className="text-gray-400 text-sm mt-1">{video.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {video.is_vip ? (
                <span className="badge-vip"><Crown size={12} />VIP</span>
              ) : (
                <span className="badge-free">FREE</span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Eye size={12} />
                {(video.view_count || 0).toLocaleString('tr-TR')} izlenme
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {video.model_name && (
              <Link to="/models" className="flex items-center gap-1.5 bg-dark-600 hover:bg-dark-500 rounded-full px-3 py-1.5 text-xs text-gray-300 transition-colors">
                <Users size={12} className="text-primary-400" />
                {video.model_name}
              </Link>
            )}
            {video.category_name && (
              <Link to="/categories" className="flex items-center gap-1.5 bg-dark-600 hover:bg-dark-500 rounded-full px-3 py-1.5 text-xs text-gray-300 transition-colors">
                <Tag size={12} className="text-primary-400" />
                {video.category_name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoPage;
