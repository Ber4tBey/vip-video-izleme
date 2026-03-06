import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus, Crown, Trash2, Eye, EyeOff, CalendarDays, Clock, Plus, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdmin } from '../../../context/AdminContext';

const VIP_PRESETS = [
  { label: '7 Gün',   days: 7 },
  { label: '30 Gün',  days: 30 },
  { label: '90 Gün',  days: 90 },
  { label: '365 Gün', days: 365 },
];

const USERS_PER_PAGE = 20;

/** Format remaining VIP time as human-readable text */
const formatRemaining = (expiresAt) => {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diffMs = exp - now;

  if (diffMs <= 0) return { text: 'Süresi dolmuş', expired: true };

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return { text: `${days} gün ${hours} saat kaldı`, expired: false };
  if (hours > 0) return { text: `${hours} saat kaldı`, expired: false };
  return { text: 'Birkaç dakika kaldı', expired: false };
};

const UserManagement = () => {
  const { users, usersPagination, loading, fetchUsers, addUser, setVIP, deleteUser } = useAdmin();
  const [form, setForm] = useState({ username: '', password: '', isVIP: false, vipDays: 30 });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vipModal, setVipModal] = useState(null);
  const [vipDaysInput, setVipDaysInput] = useState(30);
  const [customDays, setCustomDays] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef(null);

  // Debounced search
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  }, []);

  // Fetch when page or search changes
  useEffect(() => {
    fetchUsers({ page: usersPagination.page, limit: USERS_PER_PAGE, search: searchQuery });
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (page) => {
    fetchUsers({ page, limit: USERS_PER_PAGE, search: searchQuery });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.username.trim() || !form.password.trim()) {
      return setError('Tüm alanları doldurun.');
    }
    const result = await addUser({
      username: form.username.trim(),
      password: form.password,
      isVIP: form.isVIP,
      vipDays: form.isVIP ? form.vipDays : undefined,
    });
    if (result.success) {
      setSuccess(`"${form.username}" kullanıcısı oluşturuldu.`);
      setForm({ username: '', password: '', isVIP: false, vipDays: 30 });
    } else {
      setError(result.error);
    }
  };

  const handleGrantVIP = async (days) => {
    if (!vipModal || !days || days <= 0) return;
    await setVIP(vipModal.userId, days);
    setVipModal(null);
  };

  const handleRemoveVIP = async (userId) => {
    if (!confirm('VIP üyeliği kaldır?')) return;
    await setVIP(userId, 0);
  };

  const { page, totalPages, total } = usersPagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-primary-400" />
          Yeni Kullanıcı Ekle
        </h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-400 mb-1">Kullanıcı Adı</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="kullanici_adi"
              className="input-field text-sm"
            />
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-gray-400 mb-1">Şifre</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="input-field text-sm pr-9"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVIP"
              checked={form.isVIP}
              onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
              className="w-4 h-4 accent-yellow-400"
            />
            <label htmlFor="isVIP" className="text-sm text-gray-300 whitespace-nowrap">VIP Üye</label>
          </div>
          {form.isVIP && (
            <div className="min-w-24">
              <label className="block text-xs text-gray-400 mb-1">VIP Süresi</label>
              <select
                value={form.vipDays}
                onChange={(e) => setForm({ ...form, vipDays: parseInt(e.target.value) })}
                className="input-field text-sm"
              >
                {VIP_PRESETS.map((p) => (
                  <option key={p.days} value={p.days}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary text-sm">
            <UserPlus size={14} />
            Ekle
          </button>
        </form>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-400 text-xs mt-2">{success}</p>}
      </div>

      {/* Search + User list */}
      <div className="card overflow-hidden">
        {/* Search bar + count */}
        <div className="p-4 border-b border-dark-500 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="input-field text-sm pl-9"
            />
          </div>
          <span className="text-xs text-gray-500">
            {total} kullanıcı{searchQuery && ' bulundu'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">VIP Durumu</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Oluşturulma</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">Yükleniyor...</td>
                </tr>
              ) : users.filter(u => !u.is_admin).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">
                    {searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz kullanıcı yok.'}
                  </td>
                </tr>
              ) : (
                users.filter(u => !u.is_admin).map((user) => {
                  const remaining = user.is_vip ? formatRemaining(user.vip_expires_at) : null;
                  const isEffectiveVip = user.is_vip && (!remaining || !remaining.expired);

                  return (
                    <tr key={user.id} className="border-b border-dark-600 hover:bg-dark-600/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-700/30 flex items-center justify-center text-primary-400 font-bold text-xs">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEffectiveVip ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="badge-vip w-fit"><Crown size={10} />VIP</span>
                            {remaining && (
                              <span className="text-xs text-yellow-400/70 flex items-center gap-1">
                                <Clock size={10} />
                                {remaining.text}
                              </span>
                            )}
                            {!user.vip_expires_at && (
                              <span className="text-xs text-gray-500">Süresiz</span>
                            )}
                          </div>
                        ) : user.is_vip && remaining?.expired ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="badge-free">Süresi Dolmuş</span>
                            <span className="text-xs text-red-400/70 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(user.vip_expires_at).toLocaleDateString('tr-TR')} tarihinde doldu
                            </span>
                          </div>
                        ) : (
                          <span className="badge-free">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEffectiveVip ? (
                            <>
                              <button
                                onClick={() => { setVipModal({ userId: user.id, username: user.username }); setVipDaysInput(30); setCustomDays(''); }}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 transition-all flex items-center gap-1"
                              >
                                <Plus size={12} />
                                Uzat
                              </button>
                              <button
                                onClick={() => handleRemoveVIP(user.id)}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-dark-500 text-gray-400 hover:text-red-400 hover:bg-dark-400 transition-all"
                              >
                                VIP Kaldır
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setVipModal({ userId: user.id, username: user.username }); setVipDaysInput(30); setCustomDays(''); }}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-dark-500 text-gray-400 hover:text-yellow-400 hover:bg-dark-400 transition-all flex items-center gap-1"
                            >
                              <Crown size={12} />
                              VIP Yap
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm('Kullanıcıyı sil?')) deleteUser(user.id); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-500 text-red-400 hover:bg-red-900/30 transition-all"
                          >
                            <Trash2 size={12} />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-500">
            <span className="text-xs text-gray-500">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIP Duration Modal */}
      {vipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in" onClick={() => setVipModal(null)}>
          <div className="w-full max-w-sm glass rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Crown size={18} className="text-vip-gold" />
                VIP Süresi Belirle
              </h3>
              <button onClick={() => setVipModal(null)} className="p-1 hover:bg-dark-500 rounded-lg text-gray-400 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              <span className="text-white font-medium">{vipModal.username}</span> kullanıcısına VIP süresi tanımla:
            </p>

            {/* Preset buttons */}
            <div className="grid grid-cols-2 gap-2">
              {VIP_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setVipDaysInput(p.days)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    vipDaysInput === p.days && !customDays
                      ? 'bg-vip-gold/20 border border-vip-gold text-vip-gold'
                      : 'bg-dark-600 border border-dark-400 text-gray-300 hover:border-vip-gold/50 hover:text-vip-gold'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Özel (gün)</label>
              <input
                type="number"
                min="1"
                max="3650"
                value={customDays}
                onChange={(e) => { setCustomDays(e.target.value); setVipDaysInput(0); }}
                placeholder="Örn: 15"
                className="input-field text-sm"
              />
            </div>

            <button
              onClick={() => handleGrantVIP(customDays ? parseInt(customDays) : vipDaysInput)}
              disabled={!vipDaysInput && !customDays}
              className="btn-vip w-full justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crown size={14} />
              {customDays ? `${customDays} Gün` : VIP_PRESETS.find(p => p.days === vipDaysInput)?.label || `${vipDaysInput} Gün`} VIP Ver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
