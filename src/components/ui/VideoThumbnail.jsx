import { useState } from 'react';
import { Play } from 'lucide-react';

const VideoThumbnail = ({ thumbnail = '', className = '', alt = '', loading = 'lazy' }) => {
  const [failedSource, setFailedSource] = useState('');
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
