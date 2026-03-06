import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Crown, Send, ArrowLeft, Eye, Lock, Tag, Users, Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { matchSlug } from '../../utils/slugify';
import { getMediaUrl, getVideoPlaybackUrl } from '../../utils/api';
import HlsVideoPlayer from '../../components/ui/HlsVideoPlayer';

const VideoPage = () => {
  const { slug } = useParams();
  const { activeVideos, incrementViewCount, loading: videosLoading } = useVideo();
  const { isVIP, isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [playbackUrl, setPlaybackUrl] = useState('');
  const [playbackError, setPlaybackError] = useState('');
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const hasCountedViewRef = useRef(false);

  const video = activeVideos.find((v) => matchSlug(v, slug));
  const canWatch = !!video && (!video.is_vip || isVIP || isAdmin);
  const tgLink = settings.telegramLink || 'https://t.me/yourusername';

  useEffect(() => {
    hasCountedViewRef.current = false;
  }, [video?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!video || !canWatch) return undefined;

    setPlaybackLoading(true);
    setPlaybackError('');
    setPlaybackUrl('');

    getVideoPlaybackUrl(video)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          setPlaybackError('Video linki alinamadi.');
          return;
        }
        setPlaybackUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlaybackError(err.message || 'Video acilirken hata olustu.');
      })
      .finally(() => {
        if (!cancelled) setPlaybackLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canWatch, video?.id, video?.url, video?.streamtape_url]);

  if (!video) {
    if (videosLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 size={40} className="animate-spin text-primary-500" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-gray-500 text-lg mb-4">Video bulunamadi.</p>
        <Link to="/videos" className="btn-ghost text-sm">Videolara don</Link>
      </div>
    );
  }

  const onVideoPlay = () => {
    if (hasCountedViewRef.current) return;
    hasCountedViewRef.current = true;
    incrementViewCount?.(video.id);
  };

  return (
    <>
      <SEO
        title={`${video.title} — Türk İfşa Porno İzle`}
        description={video.description || `${video.title} ifşa ve sex videosu full HD kalitede izle. ${video.model_name ? video.model_name + ' ifşa' : 'Türk porno'}, ${video.category_name || 'sikiş videoları'}.`}
        keywords={`${video.title}, ${video.model_name || ''}, ${video.category_name || ''}, türk ifşa, porno izle, hd sex, sikiş, yerli porno`}
        image={video.thumbnail_url ? getMediaUrl(video.thumbnail_url) : undefined}
        type="video.other"
        noindex={video.is_vip}
        jsonLd={!video.is_vip ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "name": video.title,
          "description": video.description || `${video.title} ifşa ve porno videosu`,
          "thumbnailUrl": video.thumbnail_url ? getMediaUrl(video.thumbnail_url) : undefined,
          "uploadDate": video.created_at,
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/WatchAction",
            "userInteractionCount": video.view_count || 0
          }
        } : undefined}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
          <ArrowLeft size={15} />
          Geri
        </button>

        {canWatch ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            {playbackLoading ? (
              <div className="aspect-video bg-black w-full flex items-center justify-center text-sm text-gray-400">
                Video hazirlaniyor...
              </div>
            ) : playbackError ? (
              <div className="aspect-video bg-black w-full flex items-center justify-center text-sm text-red-400 px-4 text-center">
                {playbackError}
              </div>
            ) : (
              <HlsVideoPlayer
                src={playbackUrl}
                poster={getMediaUrl(video.thumbnail_url)}
                onPlay={onVideoPlay}
              />
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-700 border border-dark-500 aspect-video flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-vip-gold/10 border-2 border-vip-gold flex items-center justify-center">
              <Lock size={32} className="text-vip-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">VIP Icerik</h2>
              <p className="text-gray-400 max-w-md">
                Bu videoyu izlemek icin VIP uyelik gereklidir.
              </p>
            </div>
            <a
              href={tgLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-vip text-base px-8 py-3"
            >
              <Send size={16} />
              Telegram'dan VIP Uyelik Al
            </a>
          </div>
        )}

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
