import { useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, Pencil, Save, X } from 'lucide-react';
import { useVideo } from '../../../context/VideoContext';
import FileUpload from '../../../components/ui/FileUpload';
import { getMediaUrl } from '../../../utils/api';

const EMPTY = { name: '', description: '', file: null, previewUrl: '' };

const ModelManagement = () => {
  const { models, addModel, deleteModel, toggleModelActive, updateModel } = useVideo();
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return flash('error', 'İsim zorunludur.');
    
    const fd = new FormData();
    fd.append('name', form.name);
    if (form.description) fd.append('description', form.description);
    if (form.file) fd.append('image', form.file);

    if (editId) {
      updateModel(editId, fd);
      flash('success', 'Model güncellendi.');
      setEditId(null);
    } else {
      addModel(fd);
      flash('success', 'Model eklendi.');
    }
    setForm(EMPTY);
  };

  const startEdit = (m) => {
    setForm({ name: m.name, description: m.description || '', file: null, previewUrl: getMediaUrl(m.image_url) || '' });
    setEditId(m.id);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY);
  };

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="card p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center justify-between">
          {editId ? 'Modeli Düzenle' : 'Yeni Model Ekle'}
          {editId && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          )}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-gray-400 mb-1">Model Adı *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Adı"
                className="input-field text-sm"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-400 mb-1">Biyografi (isteğe bağlı)</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Kısa açıklama..."
                className="input-field text-sm"
              />
            </div>
          </div>

          <FileUpload
            type="image"
            accept="image/jpeg,image/png,image/gif,image/webp"
            label="Profil Resmi (isteğe bağlı)"
            value={form.previewUrl}
            onChange={({ file, previewUrl }) => setForm({ ...form, file, previewUrl })}
          />

          {msg.text && (
            <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm">
              <Save size={14} />
              {editId ? 'Güncelle' : 'Ekle'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit} className="btn-ghost text-sm">
                <X size={14} />
                İptal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {models.length === 0 ? (
          <p className="text-gray-500 text-sm col-span-full text-center py-8">Henüz model yok.</p>
        ) : (
          models.map((m) => (
            <div key={m.id} className={`card p-4 flex items-center gap-3 ${!m.is_active ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-dark-500 bg-primary-700/30">
                {m.image_url ? (
                  <img
                    src={getMediaUrl(m.image_url)}
                    alt={m.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-primary-400 font-bold">{m.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{m.name}</p>
                {m.description && <p className="text-gray-500 text-xs truncate">{m.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleModelActive(m.id)}
                  className={`p-1.5 rounded-lg transition-all ${m.is_active ? 'text-green-400 hover:bg-green-900/20' : 'text-gray-600 hover:bg-dark-500'}`}
                  title={m.is_active ? 'Pasif yap' : 'Aktif yap'}
                >
                  {m.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => startEdit(m)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-500 transition-all"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => { if (confirm('Modeli sil?')) deleteModel(m.id); }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ModelManagement;
