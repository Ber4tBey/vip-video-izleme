import { useState } from 'react';
import { Megaphone, ToggleLeft, ToggleRight, Save, X, ExternalLink } from 'lucide-react';
import { useAds, AD_SLOTS } from '../../../context/AdsContext';
import FileUpload from '../../../components/ui/FileUpload';
import { getMediaUrl } from '../../../utils/api';

const AdManagement = () => {
  const { ads, updateAd, toggleAd } = useAds();
  const [editing, setEditing] = useState(null); // slotId being edited
  const [form, setForm] = useState({ file: null, previewUrl: '', linkUrl: '', altText: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const startEdit = (slotId) => {
    const ad = ads[slotId];
    setForm({ file: null, previewUrl: ad.image_url ? getMediaUrl(ad.image_url) : '', linkUrl: ad.link_url || '', altText: ad.alt_text || '' });
    setEditing(slotId);
  };

  const handleSave = (slotId) => {
    if (!form.file && !form.previewUrl) {
      return flash('error', 'Lütfen bir resim yükleyin.');
    }
    
    const fd = new FormData();
    if (form.file) fd.append('image', form.file);
    fd.append('linkUrl', form.linkUrl.trim());
    fd.append('altText', form.altText.trim() || 'Reklam');

    updateAd(slotId, fd);
    flash('success', 'Reklam güncellendi.');
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Her slot için bir resim yükleyin (JPG, PNG, GIF desteklenir). Slotu aktifleştirin, ardından sitede görünür hale gelir.
      </p>

      {AD_SLOTS.map((slot) => {
        const ad = ads[slot.id];
        const isEditing = editing === slot.id;

        return (
          <div key={slot.id} className={`card overflow-hidden transition-all ${!ad.is_active ? 'opacity-60' : ''}`}>
            {/* Slot header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-600">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-dark-500 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={14} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{slot.label}</p>
                  <p className="text-gray-500 text-xs capitalize">{slot.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Aktif toggle */}
                <button
                  onClick={() => toggleAd(slot.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    ad.is_active
                      ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      : 'bg-dark-500 text-gray-500 hover:bg-dark-400 hover:text-gray-300'
                  }`}
                >
                  {ad.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {ad.is_active ? 'Aktif' : 'Pasif'}
                </button>
                {/* Düzenle */}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(slot.id)}
                    className="btn-ghost text-xs py-1.5 px-3"
                  >
                    Resim Yükle
                  </button>
                )}
              </div>
            </div>

            {/* Mevcut resim önizleme */}
            {!isEditing && ad.image_url && (
              <div className="p-4 flex items-center gap-4">
                <div className="w-32 h-14 rounded-lg bg-dark-600 overflow-hidden flex-shrink-0 border border-dark-500">
                  <img
                    src={getMediaUrl(ad.image_url)}
                    alt="Önizleme"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.src = ''; e.target.alt = 'Hatalı URL'; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 truncate">{ad.image_url}</p>
                  {ad.link_url && (
                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-400 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <ExternalLink size={11} />
                      {ad.link_url}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Düzenleme formu */}
            {isEditing && (
              <div className="p-4 space-y-3 bg-dark-800/40">
                <FileUpload
                  type="image"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  label="Reklam Görseli *"
                  value={form.previewUrl}
                  onChange={({ file, previewUrl }) => setForm({ ...form, file, previewUrl })}
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Tıklama Linki <span className="text-gray-600">(isteğe bağlı)</span>
                  </label>
                  <input
                    type="url"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://reklam-sitesi.com"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Alt Metin</label>
                  <input
                    type="text"
                    value={form.altText}
                    onChange={(e) => setForm({ ...form, altText: e.target.value })}
                    placeholder="Reklam açıklaması"
                    className="input-field text-sm"
                  />
                </div>

                {msg.text && (
                  <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {msg.text}
                  </p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => handleSave(slot.id)} className="btn-primary text-sm">
                    <Save size={14} />
                    Kaydet
                  </button>
                  <button onClick={() => { setEditing(null); setMsg({ type: '', text: '' }); }} className="btn-ghost text-sm">
                    <X size={14} />
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {msg.text && !editing && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
      )}
    </div>
  );
};

export default AdManagement;
