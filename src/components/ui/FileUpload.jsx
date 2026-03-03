import { useRef, useState } from 'react';
import { Upload, X, Image, Film, CheckCircle } from 'lucide-react';

/**
 * FileUpload — Drag & drop / click to upload
 *
 * Props:
 *  accept      – e.g. "image/*" | "video/*" | "image/jpeg,image/png,image/gif"
 *  type        – "image" | "video"
 *  value       – current data URL / object URL (for preview)
 *  onChange    – (dataUrl | objectUrl) => void
 *  label       – field label
 *  note        – extra helper text
 */
const FileUpload = ({ accept = 'image/*', type = 'image', value, onChange, label, note }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100 for video
  const [error, setError] = useState('');

  const readFile = (file) => {
    setError('');
    setLoading(true);
    setProgress(0);

    const reader = new FileReader();

    if (type === 'video') {
      // Video — ArrayBuffer okuma ile gerçek progress eventi alır
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      reader.onload = (e) => {
        const blob = new Blob([e.target.result], { type: file.type });
        const url = URL.createObjectURL(blob);
        onChange({ file, previewUrl: url });
        setLoading(false);
        setProgress(100);
      };
      reader.onerror = () => {
        setError('Video okunamadı.');
        setLoading(false);
        setProgress(0);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Resim — Base64 DataURL (localStorage'ın kaldırabileceği boyut)
    reader.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = (e) => {
      onChange({ file, previewUrl: e.target.result });
      setLoading(false);
      setProgress(100);
    };
    reader.onerror = () => {
      setError('Dosya okunamadı.');
      setLoading(false);
      setProgress(0);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    // Boyut kontrolü: resim max 5MB, video max 500MB
    const maxMB = type === 'video' ? 500 : 5;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Dosya çok büyük (max ${maxMB}MB).`);
      return;
    }
    readFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onInputChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange({ file: null, previewUrl: '' });
    setError('');
  };

  const isImage = type === 'image';

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs text-gray-400">{label}</label>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
          /* Preview + clear */
          <div className="relative group">
            {isImage ? (
              <img
                src={value}
                loading="lazy"
                decoding="async"
                alt="Önizleme"
                className="w-full max-h-48 object-contain p-1"
                onError={(e) => { e.target.src = ''; onChange({ file: null, previewUrl: '' }); }}
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary-700/30 flex items-center justify-center flex-shrink-0">
                  <Film size={18} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Video yüklendi</p>
                  <p className="text-xs text-gray-500">Sayfa yenilenirse tekrar yükleyin</p>
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
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 text-center min-h-inherit">
            {loading ? (
              <div className="flex flex-col items-center gap-3 w-full px-4 py-2">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-8 h-8 rounded-lg bg-primary-700/30 flex items-center justify-center flex-shrink-0">
                    <Film size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-400 font-medium">
                        {type === 'video' ? 'Video işleniyor…' : 'Yükleniyor…'}
                      </span>
                      <span className="text-xs text-primary-400 font-bold">{progress}%</span>
                    </div>
                    {/* Progress bar */}
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
                    <span className="text-primary-400 font-medium">Tıkla</span> veya sürükleyip bırak
                  </p>
                  <p className="text-xs text-gray-600">
                    {isImage ? 'JPG, PNG, GIF, WebP · Max 5MB' : 'MP4, WebM, AVI · Max 500MB'}
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

