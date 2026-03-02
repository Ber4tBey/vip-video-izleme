import { useState } from 'react';
import { Plus, Pencil, Trash2, Crown, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { useVideo } from '../../../context/VideoContext';
import FileUpload from '../../../components/ui/FileUpload';
import VideoThumbnail from '../../../components/ui/VideoThumbnail';
import { getSecureVideoUrl } from '../../../utils/api';
import { slugify } from '../../../utils/slugify';

const EMPTY_FORM = {
  title: '', description: '', file: null, previewUrl: '',
  categoryId: '', modelId: '', isVIP: false, isActive: true,
};

const VideoManagement = () => {
  const { videos, activeCategories, activeModels, models, categories,
    addVideo, updateVideo, deleteVideo, toggleVideoActive } = useVideo();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const allCategories = categories;
  const allModels = models;

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return flash('error', 'Başlık zorunludur.');
    }
    if (!editId && !form.file) {
      return flash('error', 'Video dosyası zorunludur.');
    }

    const fd = new FormData();
    fd.append('title', form.title);
    if (form.description) fd.append('description', form.description);
    if (form.categoryId) fd.append('categoryId', form.categoryId);
    if (form.modelId) fd.append('modelId', form.modelId);
    fd.append('isVIP', form.isVIP ? 'true' : 'false');
    fd.append('isActive', form.isActive ? 'true' : 'false');
    if (form.file) {
      fd.append('video', form.file);
    }

    if (editId) {
      updateVideo(editId, fd);
      flash('success', 'Video güncellendi.');
    } else {
      addVideo(fd);
      flash('success', 'Video eklendi.');
    }
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (v) => {
    setForm({
      title: v.title, description: v.description || '', file: null, previewUrl: v.url,
      categoryId: v.categoryId || '', modelId: v.modelId || '',
      isVIP: !!v.is_vip, isActive: !!v.is_active,
    });
    setEditId(v.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Add/Edit toggle */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus size={15} />
          Yeni Video Ekle
        </button>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">
              {editId ? 'Videoyu Düzenle' : 'Yeni Video Ekle'}
            </h3>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Video başlığı" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Açıklama</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Açıklama (isteğe bağlı)" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kategori (isteğe bağlı)</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field text-sm">
                  <option value="">Seçiniz</option>
                  {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Model (isteğe bağlı)</label>
                <select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  className="input-field text-sm">
                  <option value="">Seçiniz</option>
                  {allModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Video upload */}
            <FileUpload
              type="video"
              accept="video/*"
              label="Video Dosyası *"
              value={form.previewUrl}
              onChange={({ file, previewUrl }) => setForm({ ...form, file, previewUrl })}
              note="MP4, WebM desteklenir. Sayfa yenilenirse video yeniden yüklenmelidir."
            />

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isVIP} onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
                  className="w-4 h-4 accent-yellow-400" />
                <span className="text-sm text-gray-300 flex items-center gap-1"><Crown size={13} className="text-vip-gold" /> VIP İçerik</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-green-400" />
                <span className="text-sm text-gray-300">Aktif</span>
              </label>
            </div>

            {msg.text && (
              <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">
                <Save size={14} />
                {editId ? 'Güncelle' : 'Ekle'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-ghost text-sm">İptal</button>
            </div>
          </form>
        </div>
      )}

      {msg.text && !showForm && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
      )}

      {/* Video list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Video</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Tür</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">İzlenme</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Durum</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">Henüz video yok.</td></tr>
              ) : (
                videos.map((v) => {
                  const cat = allCategories.find((c) => c.id === v.categoryId);
                  const mod = allModels.find((m) => m.id === v.modelId);
                  return (
                    <tr key={v.id} className={`border-b border-dark-600 hover:bg-dark-600/30 transition-colors ${!v.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a href={`/video/${slugify(v.title)}`} target="_blank" rel="noopener noreferrer" className="w-16 h-9 rounded bg-dark-600 flex-shrink-0 overflow-hidden block hover:opacity-80 transition-opacity">
                            {v.url && (
                              <VideoThumbnail src={getSecureVideoUrl(v.url)} alt={v.title} className="w-full h-full" />
                            )}
                          </a>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">{v.title}</p>
                            <p className="text-gray-500 text-xs truncate">{mod?.name || '—'} · {cat?.name || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {v.is_vip ? <span className="badge-vip"><Crown size={10}/>VIP</span> : <span className="badge-free">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{(v.view_count || 0).toLocaleString('tr-TR')}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleVideoActive(v.id)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full font-medium transition-all ${
                            v.is_active ? 'bg-green-900/30 text-green-400' : 'bg-dark-500 text-gray-500'
                          }`}>
                          {v.is_active ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                          {v.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(v)}
                            className="p-1.5 rounded-lg bg-dark-500 text-gray-400 hover:text-white transition-all">
                            <Pencil size={13}/>
                          </button>
                          <button onClick={() => { if (confirm('Videoyu sil?')) deleteVideo(v.id); }}
                            className="p-1.5 rounded-lg bg-dark-500 text-red-400 hover:bg-red-900/30 transition-all">
                            <Trash2 size={13}/>
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
