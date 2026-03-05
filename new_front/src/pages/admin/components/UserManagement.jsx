import { useState } from 'react';
import { UserPlus, Crown, Trash2, Eye, EyeOff, CalendarDays } from 'lucide-react';
import { useAdmin } from '../../../context/AdminContext';

const UserManagement = () => {
  const { users, addUser, toggleVIP, deleteUser } = useAdmin();
  const [form, setForm] = useState({ username: '', password: '', isVIP: false });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.username.trim() || !form.password.trim()) {
      return setError('Tüm alanları doldurun.');
    }
    const result = await addUser({ username: form.username.trim(), password: form.password, isVIP: form.isVIP });
    if (result.success) {
      setSuccess(`"${form.username}" kullanıcısı oluşturuldu.`);
      setForm({ username: '', password: '', isVIP: false });
    } else {
      setError(result.error);
    }
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
          <button type="submit" className="btn-primary text-sm">
            <UserPlus size={14} />
            Ekle
          </button>
        </form>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-400 text-xs mt-2">{success}</p>}
      </div>

      {/* User list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Durum</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Oluşturulma</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">Henüz kullanıcı yok.</td>
                </tr>
              ) : (
                users.filter(u => !u.is_admin).map((user) => (
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
                      {user.is_vip ? (
                        <span className="badge-vip"><Crown size={10} />VIP</span>
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
                        <button
                          onClick={() => toggleVIP(user.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                            user.is_vip
                              ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                              : 'bg-dark-500 text-gray-400 hover:text-yellow-400 hover:bg-dark-400'
                          }`}
                        >
                          {user.is_vip ? 'VIP Kaldır' : 'VIP Yap'}
                        </button>
                        <button
                          onClick={() => { if (confirm('Kullanıcıyı sil?')) deleteUser(user.id); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-500 text-red-400 hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
