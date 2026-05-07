import { useState, useMemo } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Save, X, Tag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVideo } from '../../../context/VideoContext';
import FileUpload from '../../../components/ui/FileUpload';
import { getMediaUrl } from '../../../utils/api';

const CategoryManagement = () => {
  const { categories, addCategory, deleteCategory, toggleCategoryActive, updateCategory } = useVideo();
  const [form, setForm] = useState({ name: '', file: null, previewUrl: '' });
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

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

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name?.toLowerCase().includes(q));
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCategories = filteredCategories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
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

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Kategorilerde ara..."
          className="input-field text-sm pl-8 w-full"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pagedCategories.length === 0 ? (
          <p className="text-gray-500 text-sm col-span-full text-center py-8">
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz kategori yok.'}
          </p>
        ) : (
          pagedCategories.map((c) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 text-xs">
            {filteredCategories.length} kategori · Sayfa {currentPage}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-dark-600 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-600">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[30px] px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      p === currentPage
                        ? 'bg-primary text-white'
                        : 'bg-dark-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-dark-600 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
