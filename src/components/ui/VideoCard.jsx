import { Eye, Lock, Crown, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import VideoThumbnail from './VideoThumbnail';
import { slugify } from '../../utils/slugify';
import { getSecureVideoUrl } from '../../utils/api';

const VideoCard = ({ video, showViewCount = true }) => {
  const { isVIP, isAdmin } = useAuth();
  const { settings } = useSettings();

  const canWatch = !video.is_vip || isVIP || isAdmin;
  const slug = slugify(video.title);
  const videoUrl = `/video/${slug}`;
  const tgLink = settings.telegramLink || 'https://t.me/yourusername';

  const inner = (
    <div className={`card group cursor-pointer hover:border-dark-400 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 hover:-translate-y-1 ${!canWatch ? 'opacity-90' : ''}`}>
      {/* Thumbnail */}
      <div className="relative overflow-hidden aspect-video bg-dark-600">
        <VideoThumbnail
          src={getSecureVideoUrl(video.url)}
          alt={video.title}
          className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
        />

        {/* VIP overlay */}
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

        {/* View count */}
        {showViewCount && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5 text-xs text-gray-300 z-30">
            <Eye size={10} />
            {formatViewCount(video.view_count || 0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white truncate group-hover:text-primary-400 transition-colors">
          {video.title}
        </h3>
        {video.model_name && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{video.model_name}</p>
        )}
        {video.category_name && (
          <span className="inline-block mt-1.5 text-xs bg-dark-500 text-gray-400 px-2 py-0.5 rounded-full">
            {video.category_name}
          </span>
        )}
      </div>
    </div>
  );

  // VIP content → open telegram in new tab
  if (!canWatch) {
    return (
      <a href={tgLink} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return <Link to={videoUrl}>{inner}</Link>;
};

const formatViewCount = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

export default VideoCard;
