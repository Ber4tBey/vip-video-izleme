import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

/**
 * VideoThumbnail
 * - Shows a static thumbnail `<img>` by default
 * - On hover (PC) or long press (mobile), fades in a muted MP4 preview video (autoplay, loop)
 * - Falls back to first video frame if no thumbnail is provided
 */
const VideoThumbnail = ({
  thumbnail = '',
  previewSrc = '',  // Short MP4 preview clip URL
  videoSrc = '',    // HLS URL (only used as last resort if no thumbnail)
  className = '',
  alt = '',
  loading = 'lazy',
}) => {
  const [failedThumb, setFailedThumb] = useState(false);
  const [hovering, setHovering] = useState(false);
  const longPressRef = useRef(null);

  const hasThumb = Boolean(thumbnail && !failedThumb);
  const hasPreview = Boolean(previewSrc);

  const startPreview = () => setHovering(true);
  const stopPreview = () => setHovering(false);

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(startPreview, 400);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressRef.current);
    stopPreview();
  };

  // No content at all
  if (!hasThumb && !hasPreview && !videoSrc) {
    return (
      <div
        className={`bg-gradient-to-br from-dark-500 to-dark-700 flex items-center justify-center ${className}`}
        aria-label={alt || 'Video placeholder'}
      >
        <Play size={22} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={hasPreview ? startPreview : undefined}
      onMouseLeave={hasPreview ? stopPreview : undefined}
      onTouchStart={hasPreview ? handleTouchStart : undefined}
      onTouchEnd={hasPreview ? handleTouchEnd : undefined}
      onTouchCancel={hasPreview ? handleTouchEnd : undefined}
    >
      {/* Thumbnail image (base layer) */}
      {hasThumb ? (
        <img
          src={thumbnail}
          alt={alt || 'Video thumbnail'}
          loading={loading}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            hovering && hasPreview ? 'opacity-0' : 'opacity-100'
          }`}
          onError={() => setFailedThumb(true)}
        />
      ) : (
        /* No thumbnail: show a dark placeholder while preview may load */
        <div className="absolute inset-0 bg-dark-600" />
      )}

      {/* MP4 preview video — only rendered while hovering to save bandwidth */}
      {hasPreview && hovering && (
        <video
          key={previewSrc}
          src={previewSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          aria-label={`${alt} preview`}
        />
      )}
    </div>
  );
};

export default VideoThumbnail;
