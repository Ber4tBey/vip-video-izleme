import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

const VideoThumbnail = ({
  thumbnail = '',
  videoSrc = '',
  className = '',
  alt = '',
  loading = 'lazy',
}) => {
  const [failedSource, setFailedSource] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  if (thumbnail && failedSource !== thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={alt || 'Video thumbnail'}
        loading={loading}
        decoding="async"
        className={className}
        onError={() => setFailedSource(thumbnail)}
      />
    );
  }

  if (videoSrc && !videoFailed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {!videoReady && <div className="absolute inset-0 bg-dark-600 animate-pulse z-10" />}
        <video
          ref={videoRef}
          src={videoSrc}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover"
          aria-label={alt || 'Video thumbnail fallback'}
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (duration && Number.isFinite(duration)) {
              event.currentTarget.currentTime = Math.min(2, duration * 0.25);
            } else {
              setVideoReady(true);
            }
          }}
          onLoadedData={() => setVideoReady(true)}
          onSeeked={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-dark-500 to-dark-700 flex items-center justify-center ${className}`}
      aria-label={alt || 'Video thumbnail placeholder'}
    >
      <Play size={22} className="text-gray-400" />
    </div>
  );
};

export default VideoThumbnail;
