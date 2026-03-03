import { useRef, useState } from 'react';
import { X, Image, Film, CheckCircle } from 'lucide-react';

const bytesToHuman = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * FileUpload - Drag & drop / click upload selector.
 * For video: keeps File object directly (no full read in memory).
 * For image: reads DataURL preview.
 */
const FileUpload = ({ accept = 'image/*', type = 'image', value, onChange, label, note }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);

  const isImage = type === 'image';

  const readImage = (file) => {
    setLoading(true);
    setProgress(0);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setProgress(Math.round((event.loaded / event.total) * 100));
    };
    reader.onload = (event) => {
      onChange({ file, previewUrl: event.target.result });
      setLoading(false);
      setProgress(100);
    };
    reader.onerror = () => {
      setError('Dosya okunamadi.');
      setLoading(false);
      setProgress(0);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    setError('');

    const maxMB = isImage ? 5 : 2048;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Dosya cok buyuk (max ${maxMB}MB).`);
      return;
    }

    if (isImage) {
      readImage(file);
      return;
    }

    // Video: keep selected file as-is, preview via object URL.
    setLoading(false);
    setProgress(0);
    setVideoInfo({ name: file.name, size: file.size });
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const onInputChange = (event) => {
    handleFile(event.target.files[0]);
    event.target.value = '';
  };

  const clear = (event) => {
    event.stopPropagation();
    onChange({ file: null, previewUrl: '' });
    setError('');
    setLoading(false);
    setProgress(0);
    setVideoInfo(null);
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-gray-400">{label}</label>}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 overflow-hidden
          ${dragging ? 'border-primary-500 bg-primary-900/20' : 'border-dark-400 hover:border-dark-300 bg-dark-700/60 hover:bg-dark-600/60'}
          ${isImage ? 'min-h-28' : 'min-h-16'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />

        {value ? (
          <div className="relative group">
            {isImage ? (
              <img
                src={value}
                alt="Onizleme"
                loading="lazy"
                decoding="async"
                className="w-full max-h-48 object-contain p-1"
                onError={(event) => {
                  event.target.src = '';
                  onChange({ file: null, previewUrl: '' });
                }}
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary-700/30 flex items-center justify-center flex-shrink-0">
                  <Film size={18} className="text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {videoInfo?.name || 'Video secildi'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {videoInfo ? bytesToHuman(videoInfo.size) : 'Yuklemeye hazir'}
                  </p>
                </div>
                <CheckCircle size={16} className="ml-auto text-green-400 flex-shrink-0" />
              </div>
            )}

            <button
              type="button"
              onClick={clear}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 text-center min-h-inherit">
            {loading ? (
              <div className="flex flex-col items-center gap-3 w-full px-4 py-2">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-8 h-8 rounded-lg bg-primary-700/30 flex items-center justify-center flex-shrink-0">
                    <Image size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-400 font-medium">Hazirlaniyor...</span>
                      <span className="text-xs text-primary-400 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-dark-500 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center">
                  {isImage ? <Image size={18} className="text-gray-500" /> : <Film size={18} className="text-gray-500" />}
                </div>
                <div>
                  <p className="text-sm text-gray-400">
                    <span className="text-primary-400 font-medium">Tikla</span> veya surukleyip birak
                  </p>
                  <p className="text-xs text-gray-600">
                    {isImage ? 'JPG, PNG, GIF, WebP · Max 5MB' : 'MP4, WebM, AVI · Max 2GB'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {note && <p className="text-xs text-gray-600">{note}</p>}
    </div>
  );
};

export default FileUpload;
