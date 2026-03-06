import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function HlsVideoPlayer({ src, poster, onPlay, className = '' }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError('');
    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError('Video yüklenirken hata oluştu.');
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // iOS Safari native HLS
      video.src = src;
    } else {
      setError('Tarayıcınız HLS video formatını desteklemiyor.');
    }

    return () => {
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  const handlePlay = () => {
    onPlay?.();
  };

  if (error) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-black text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      controlsList="nodownload"
      playsInline
      preload="metadata"
      onPlay={handlePlay}
      className={`w-full aspect-video bg-black ${className}`}
      style={{ maxHeight: '80vh' }}
    />
  );
}
