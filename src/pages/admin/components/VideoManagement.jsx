import { useState } from 'react';
import { Plus, Pencil, Trash2, Crown, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { useVideo } from '../../../context/VideoContext';
import FileUpload from '../../../components/ui/FileUpload';
import VideoThumbnail from '../../../components/ui/VideoThumbnail';
import { getMediaUrl } from '../../../utils/api';
import { slugify } from '../../../utils/slugify';

const EMPTY_FORM = {
  title: '',
  description: '',
  file: null,
  previewUrl: '',
  categoryId: '',
  modelId: '',
  isVIP: false,
  isActive: true,
};

const VideoManagement = () => {
  const {
    videos,
    models,
    categories,
    addVideoWithProgress,
    updateVideo,
    deleteVideo,
    toggleVideoActive,
  } = useVideo();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isUploading) return;

    if (!form.title.trim()) {
      flash('error', 'Baslik zorunludur.');
      return;
    }

    if (!editId && !form.file) {
      flash('error', 'Video dosyasi zorunludur.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      if (editId) {
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.description) fd.append('description', form.description);
        if (form.categoryId) fd.append('categoryId', form.categoryId);
        if (form.modelId) fd.append('modelId', form.modelId);
        fd.append('isVIP', form.isVIP ? 'true' : 'false');
        fd.append('isActive', form.isActive ? 'true' : 'false');
        if (form.file) fd.append('video', form.file);

        await updateVideo(editId, fd);
        flash('success', 'Video guncellendi.');
      } else {
        await addVideoWithProgress(
          {
            file: form.file,
            title: form.title,
            description: form.description || '',
            categoryId: form.categoryId || '',
            modelId: form.modelId || '',
            isVIP: form.isVIP ? 'true' : 'false',
            isActive: form.isActive ? 'true' : 'false',
          },
          (progress) => setUploadProgress(progress)
        );
        flash('success', 'Video eklendi.');
      }

      resetForm();
    } catch (err) {
      flash('error', err.message || 'Video yuklenirken hata olustu.');
      setIsUploading(false);
    }
  };

  const startEdit = (video) => {
    setForm({
      title: video.title,
      description: video.description || '',
      file: null,
      previewUrl: video.url || '',
      categoryId: video.categoryId || '',
      modelId: video.modelId || '',
      isVIP: !!video.is_vip,
      isActive: !!video.is_active,
    });
    setEditId(video.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    if (isUploading) return;
    resetForm();
  };

  const allCategories = categories;
  const allModels = models;

  return (
    <div className="space-y-5">
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus size={15} />
          Yeni Video Ekle
        </button>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">
              {editId ? 'Videoyu Duzenle' : 'Yeni Video Ekle'}
            </h3>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-white" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Baslik *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Video basligi"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Aciklama</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Aciklama (istege bagli)"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kategori (istege bagli)</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">Seciniz</option>
                  {allCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Model (istege bagli)</label>
                <select
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">Seciniz</option>
                  {allModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FileUpload
              type="video"
              accept="video/*"
              label="Video Dosyasi *"
              value={form.previewUrl}
              onChange={({ file, previewUrl }) => setForm({ ...form, file, previewUrl })}
              note="Buyuk videolar parca parca yuklenir. Ilerleme asagida canli gorunur."
            />

            {!editId && isUploading && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Video yukleniyor...</span>
                  <span className="font-semibold text-primary-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-dark-500 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVIP}
                  onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
                  className="w-4 h-4 accent-yellow-400"
                />
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  <Crown size={13} className="text-vip-gold" />
                  VIP Icerik
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-green-400"
                />
                <span className="text-sm text-gray-300">Aktif</span>
              </label>
            </div>

            {msg.text && (
              <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {msg.text}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUploading}
                className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {isUploading ? `Yukleniyor ${uploadProgress}%` : editId ? 'Guncelle' : 'Ekle'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isUploading}
                className="btn-ghost text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Iptal
              </button>
            </div>
          </form>
        </div>
      )}

      {msg.text && !showForm && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {msg.text}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Video</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Tur</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Izlenme</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Durum</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500">
                    Henuz video yok.
                  </td>
                </tr>
              ) : (
                videos.map((video) => {
                  const category = allCategories.find((c) => c.id === video.categoryId);
                  const model = allModels.find((m) => m.id === video.modelId);
                  return (
                    <tr
                      key={video.id}
                      className={`border-b border-dark-600 hover:bg-dark-600/30 transition-colors ${!video.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/video/${slugify(video.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-9 rounded bg-dark-600 flex-shrink-0 overflow-hidden block hover:opacity-80 transition-opacity"
                          >
                            {video.url && (
                              <VideoThumbnail
                                thumbnail={getMediaUrl(video.thumbnail_url)}
                                alt={video.title}
                                className="w-full h-full"
                                loading="lazy"
                              />
                            )}
                          </a>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">{video.title}</p>
                            <p className="text-gray-500 text-xs truncate">
                              {model?.name || '-'} · {category?.name || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {video.is_vip ? (
                          <span className="badge-vip">
                            <Crown size={10} />
                            VIP
                          </span>
                        ) : (
                          <span className="badge-free">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                        {(video.view_count || 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleVideoActive(video.id)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full font-medium transition-all ${
                            video.is_active ? 'bg-green-900/30 text-green-400' : 'bg-dark-500 text-gray-500'
                          }`}
                        >
                          {video.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {video.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(video)}
                            className="p-1.5 rounded-lg bg-dark-500 text-gray-400 hover:text-white transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Videoyu sil?')) deleteVideo(video.id);
                            }}
                            className="p-1.5 rounded-lg bg-dark-500 text-red-400 hover:bg-red-900/30 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VideoManagement;
