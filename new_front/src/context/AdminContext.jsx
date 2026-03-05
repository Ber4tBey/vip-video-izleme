import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData) => {
    try {
      const newUser = await api.post('/users', userData);
      setUsers((prev) => [newUser, ...prev]);
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

  const toggleVIP = async (id) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    await updateUser(id, { isVIP: !user.is_vip });
  };

  const deleteUser = async (id) => {
    await api.delete(`/users/${id}`);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <AdminContext.Provider value={{ users, loading, fetchUsers, addUser, updateUser, toggleVIP, deleteUser }}>
      {children}
    </AdminContext.Provider>
  );
};
