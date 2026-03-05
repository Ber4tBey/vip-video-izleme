import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const SettingsContext = createContext(null);
export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

const defaults = { telegramLink: 'https://t.me/yourusername', siteName: 'ONLYMIXMEDIA' };

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    api.get('/settings').then((data) => {
      setSettings({ ...defaults, ...data });
    }).catch(() => {});
  }, []);

  const updateSettings = async (data) => {
    await api.put('/settings', data);
    setSettings((prev) => ({ ...prev, ...data }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
