import { useRef, useEffect, useState } from 'react';

/**
 * VideoThumbnail — Video URL'inden rastgele bir kare gösterir.
 * loadedmetadata event'inde random bir currentTime set eder;
 * tarayıcı o kareyi gösterir.
 */
const VideoThumbnail = ({ src, className = '', alt = '' }) => {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const handleMeta = () => {
      const duration = video.duration;
      if (duration && isFinite(duration)) {
        // %10 ile %90 arasında rastgele bir an seç
        video.currentTime = duration * (0.1 + Math.random() * 0.8);
      }
    };

    const handleSeeked = () => setReady(true);
    const handleError = () => setError(true);

    video.addEventListener('loadedmetadata', handleMeta);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleMeta);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  if (error || !src) {
    return (
      <div className={`bg-dark-600 flex items-center justify-center ${className}`}>
        <span className="text-gray-600 text-xs">Video</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!ready && (
        <div className="absolute inset-0 bg-dark-600 animate-pulse z-10" />
      )}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        muted
        playsInline
        className="w-full h-full object-cover"
        aria-label={alt}
      />
    </div>
  );
};

export default VideoThumbnail;
