import { useState } from 'react';
import { Settings, Save, Send } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';

const SiteSettings = () => {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState({
    telegramLink: settings.telegramLink || '',
    siteName: settings.siteName || '',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.telegramLink.trim()) return flash('error', 'Telegram linki zorunludur.');
    updateSettings(form);
    flash('success', 'Ayarlar kaydedildi.');
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Settings size={16} className="text-primary-400" />
          Site Ayarları
        </h3>

        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          {/* Telegram linki */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              VIP Satın Al — Telegram Linki *
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Send size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="url"
                  value={form.telegramLink}
                  onChange={(e) => setForm({ ...form, telegramLink: e.target.value })}
                  placeholder="https://t.me/kullaniciadiniz"
                  className="input-field text-sm pl-9"
                />
              </div>
              {form.telegramLink && (
                <a
                  href={form.telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs flex-shrink-0"
                >
                  Test Et
                </a>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Kullanıcılar "VIP Satın Al" butonuna tıkladığında bu adrese yönlendirilir.
            </p>
          </div>

          {/* Site adı */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Site Adı</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              placeholder="ONLYMIXMEDIA"
              className="input-field text-sm"
            />
          </div>

          {msg.text && (
            <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {msg.text}
            </p>
          )}

          <button type="submit" className="btn-primary text-sm">
            <Save size={14} />
            Kaydet
          </button>
        </form>
      </div>

      {/* Mevcut değerler özeti */}
      <div className="card p-4">
        <p className="text-xs text-gray-500 mb-2">Şu anki ayarlar:</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-28">Telegram:</span>
            <a
              href={settings.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-400 hover:underline truncate"
            >
              {settings.telegramLink || '—'}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-28">Site Adı:</span>
            <span className="text-xs text-white">{settings.siteName || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettings;
