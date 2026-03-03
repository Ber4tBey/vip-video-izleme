import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Save, X, Tag } from 'lucide-react';
import { useVideo } from '../../../context/VideoContext';
import FileUpload from '../../../components/ui/FileUpload';
import { getMediaUrl } from '../../../utils/api';

const CategoryManagement = () => {
  const { categories, addCategory, deleteCategory, toggleCategoryActive, updateCategory } = useVideo();
  const [form, setForm] = useState({ name: '', file: null, previewUrl: '' });
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return flash('error', 'Kategori adı zorunludur.');

    const fd = new FormData();
    fd.append('name', form.name);
    if (form.file) fd.append('image', form.file);

    if (editId) {
      updateCategory(editId, fd);
      flash('success', 'Kategori güncellendi.');
      setEditId(null);
    } else {
      addCategory(fd);
      flash('success', 'Kategori eklendi.');
    }
    setForm({ name: '', file: null, previewUrl: '' });
  };

  const startEdit = (c) => {
    setForm({ name: c.name, file: null, previewUrl: getMediaUrl(c.image_url) || '' });
    setEditId(c.id);
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">
          {editId ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-400 mb-1">Kategori Adı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kategori adı" className="input-field text-sm" />
          </div>
          <div className="flex gap-2 items-end">
            <button type="submit" className="btn-primary text-sm"><Save size={14}/>{editId ? 'Güncelle' : 'Ekle'}</button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ name: '', file: null, previewUrl: '' }); }} className="btn-ghost text-sm"><X size={14}/></button>
            )}
          </div>
        </form>
        <FileUpload
          type="image"
          accept="image/*"
          label="Kapak Resmi (isteğe bağlı)"
          value={form.previewUrl}
          onChange={({ file, previewUrl }) => setForm({ ...form, file, previewUrl })}
        />
        {msg.text && <p className={`text-xs mt-2 ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm col-span-full text-center py-8">Henüz kategori yok.</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className={`card p-4 flex items-center gap-3 ${!c.is_active ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-dark-500 border border-dark-400">
                {c.image_url ? (
                  <img src={getMediaUrl(c.image_url)} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag size={16} className="text-gray-400"/>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{c.name}</p>
                <p className="text-gray-600 text-xs">{c.is_active ? 'Aktif' : 'Pasif'}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => toggleCategoryActive(c.id)}
                  className={`p-1.5 rounded-lg transition-all ${c.is_active ? 'text-green-400 hover:bg-green-900/20' : 'text-gray-600 hover:bg-dark-500'}`}>
                  {c.is_active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                </button>
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-500 transition-all">
                  <Pencil size={14}/>
                </button>
                <button onClick={() => { if (confirm('Kategoriyi sil?')) deleteCategory(c.id); }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
