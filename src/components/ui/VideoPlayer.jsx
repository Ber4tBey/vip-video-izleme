import { X, Crown, Eye, Calendar, Tag, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useVideo } from '../../context/VideoContext';
import { getMediaUrl, getSecureVideoUrl } from '../../utils/api';

const VideoPlayer = ({ video, onClose }) => {
  const { incrementViewCount, categories, models } = useVideo();
  const counted = useRef(false);

  useEffect(() => {
    // Count view once per open
    if (!counted.current) {
      counted.current = true;
      incrementViewCount(video.id);
    }
    // Lock scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [video.id]);

  const category = categories.find((c) => c.id === video.categoryId);
  const model = models.find((m) => m.id === video.modelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in">
      <div className="w-full max-w-4xl glass rounded-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-dark-500">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              {video.is_vip && (
                <span className="badge-vip">
                  <Crown size={10} />
                  VIP
                </span>
              )}
            </div>
            <h2 className="text-white font-bold text-lg truncate">{video.title}</h2>
            {video.description && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{video.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-500 rounded-lg text-gray-400 hover:text-white transition-all flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="aspect-video bg-black">
          <video
            src={getSecureVideoUrl(video.url)}
            poster={getMediaUrl(video.thumbnail_url)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>

        {/* Meta */}
        <div className="p-4 flex flex-wrap gap-4 text-sm text-gray-400">
          {model && (
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-primary-400" />
              {model.name}
            </span>
          )}
          {category && (
            <span className="flex items-center gap-1.5">
              <Tag size={14} className="text-primary-400" />
              {category.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Eye size={14} className="text-primary-400" />
            {(video.view_count || 0).toLocaleString('tr-TR')} izlenme
          </span>
          {video.createdAt && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-primary-400" />
              {new Date(video.createdAt).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
