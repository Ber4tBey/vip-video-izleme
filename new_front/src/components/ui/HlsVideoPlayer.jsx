import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function HlsVideoPlayer({ src, poster, ...props }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true, // Only scale max to current viewing container
      });

      hls.loadSource(src);
      hls.attachMedia(video);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari native support
      video.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      {...props}
    />
  );
}
