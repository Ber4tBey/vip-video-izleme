import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();

  const fetchUsers = useCallback(async ({ page = 1, limit = 20, search = '' } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      const data = await api.get(`/users?${params.toString()}`);
      setUsers(data.users);
      setUsersPagination({ total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const addUser = async (userData) => {
    try {
      const newUser = await api.post('/users', userData);
      // Re-fetch current page to keep pagination consistent
      await fetchUsers({ page: usersPagination.page, limit: usersPagination.limit });
      return { success: true, user: newUser };
    } catch (e) {
      return { success: false, error: e.message || 'Kullanıcı eklenemedi' };
    }
  };

  const updateUser = async (id, changes) => {
    const updated = await api.put(`/users/${id}`, changes);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };

  /** Grant VIP for `days` days. Pass 0 to remove VIP. */
  const setVIP = async (id, days) => {
    if (days === 0) {
      return await updateUser(id, { isVIP: false, vipDays: 0 });
    }
    return await updateUser(id, { isVIP: true, vipDays: days });
  };

  const deleteUser = async (id) => {
    await api.delete(`/users/${id}`);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    // Update pagination total
    setUsersPagination((prev) => ({ ...prev, total: prev.total - 1, totalPages: Math.ceil((prev.total - 1) / prev.limit) }));
  };

  return (
    <AdminContext.Provider value={{ users, usersPagination, loading, fetchUsers, addUser, updateUser, setVIP, deleteUser }}>
      {children}
    </AdminContext.Provider>
  );
};
