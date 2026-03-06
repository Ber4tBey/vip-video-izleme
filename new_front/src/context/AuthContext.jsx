import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('vip_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('vip_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    try {
      const { token, user: u } = await api.post('/auth/login', { username, password });
      localStorage.setItem('vip_token', token);
      setUser(u);
      return { success: true, user: u };
    } catch (e) {
      return { success: false, error: e.message || 'Giriş Başarısız' };
    }
  };

  const register = async (username, password) => {
    const { token, user: u } = await api.post('/auth/register', { username, password });
    localStorage.setItem('vip_token', token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('vip_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin:    !!user?.is_admin,
    isVIP:      !!(user?.is_admin || (user?.is_vip && (!user?.vip_expires_at || new Date(user.vip_expires_at) > new Date()))),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
