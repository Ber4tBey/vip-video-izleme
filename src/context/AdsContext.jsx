import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AdsContext = createContext(null);
export const useAds = () => useContext(AdsContext);

export const AD_SLOTS = [
  { id: 'home-leaderboard',   label: 'Ana Sayfa Üst Banner',     size: 'leaderboard 728×90' },
  { id: 'home-rectangle',     label: 'Ana Sayfa Dikdörtgen',      size: 'medium rectangle 300×250' },
  { id: 'home-banner',        label: 'Ana Sayfa Alt Banner',      size: 'banner 468×60' },
  { id: 'videos-leaderboard', label: 'Videolar Sayfası Banner',   size: 'leaderboard 728×90' },
  { id: 'footer-leaderboard', label: 'Footer Banner',             size: 'leaderboard 728×90' },
];

const emptySlots = () => {
  const obj = {};
  AD_SLOTS.forEach((s) => { obj[s.id] = { slot_id: s.id, image_url: '', link_url: '', alt_text: 'Reklam', is_active: 0 }; });
  return obj;
};

export const AdsProvider = ({ children }) => {
  const [ads, setAds] = useState(emptySlots);

  useEffect(() => {
    api.get('/ads').then((data) => {
      setAds((prev) => ({ ...prev, ...data }));
    }).catch(() => {});
  }, []);

  const updateAd = async (slotId, formData) => {
    const updated = await api.uploadPut(`/ads/${slotId}`, formData);
    setAds((prev) => ({ ...prev, [slotId]: updated }));
    return updated;
  };

  const toggleAd = async (slotId) => {
    const fd = new FormData();
    fd.append('isActive', ads[slotId]?.is_active ? 'false' : 'true');
    const updated = await api.uploadPut(`/ads/${slotId}`, fd);
    setAds((prev) => ({ ...prev, [slotId]: updated }));
  };

  const getAd = (slotId) => ads[slotId] || null;

  return (
    <AdsContext.Provider value={{ ads, updateAd, toggleAd, getAd }}>
      {children}
    </AdsContext.Provider>
  );
};
