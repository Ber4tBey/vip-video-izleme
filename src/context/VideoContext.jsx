import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { uploadVideoInChunks } from '../utils/api';

const VideoContext = createContext(null);
export const useVideo = () => useContext(VideoContext);

export const VideoProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [vids, mods, cats] = await Promise.all([
        api.get('/videos'),
        api.get('/models'),
        api.get('/categories'),
      ]);
      setVideos(vids);
      setModels(mods);
      setCategories(cats);
    } catch (e) {
      console.error('fetchAll error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived
  const activeVideos     = videos.filter((v) => v.is_active);
  const activeModels     = models.filter((m) => m.is_active);
  const activeCategories = categories.filter((c) => c.is_active);
  const trendingVideos   = [...activeVideos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

  // ─── Videos CRUD (admin) ────────────────────────────────────────────────────
  const addVideo = async (formData) => {
    const v = await api.upload('/videos', formData);
    setVideos((prev) => [v, ...prev]);
    return v;
  };

  const addVideoWithProgress = async ({ file, ...metadata }, onProgress) => {
    const v = await uploadVideoInChunks({ file, metadata, onProgress });
    setVideos((prev) => [v, ...prev]);
    return v;
  };

  const updateVideo = async (id, formData) => {
    const v = await api.uploadPut(`/videos/${id}`, formData);
    setVideos((prev) => prev.map((x) => (x.id === id ? v : x)));
    return v;
  };

  const deleteVideo = async (id) => {
    await api.delete(`/videos/${id}`);
    setVideos((prev) => prev.filter((x) => x.id !== id));
  };

  const toggleVideoActive = async (id) => {
    await api.patch(`/videos/${id}/toggle`);
    setVideos((prev) => prev.map((x) => x.id === id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
  };

  const incrementViewCount = async (id) => {
    await api.post(`/videos/${id}/view`);
    setVideos((prev) => prev.map((x) => x.id === id ? { ...x, view_count: (x.view_count || 0) + 1 } : x));
  };

  // ─── Models CRUD ────────────────────────────────────────────────────────────
  const addModel = async (formData) => {
    const m = await api.upload('/models', formData);
    setModels((prev) => [...prev, m]);
    return m;
  };

  const updateModel = async (id, formData) => {
    const m = await api.uploadPut(`/models/${id}`, formData);
    setModels((prev) => prev.map((x) => (x.id === id ? m : x)));
    return m;
  };

  const deleteModel = async (id) => {
    await api.delete(`/models/${id}`);
    setModels((prev) => prev.filter((x) => x.id !== id));
  };

  const toggleModelActive = async (id) => {
    await api.patch(`/models/${id}/toggle`);
    setModels((prev) => prev.map((x) => x.id === id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
  };

  // ─── Categories CRUD ────────────────────────────────────────────────────────
  const addCategory = async (formData) => {
    const c = await api.upload('/categories', formData);
    setCategories((prev) => [...prev, c]);
    return c;
  };

  const updateCategory = async (id, formData) => {
    const c = await api.uploadPut(`/categories/${id}`, formData);
    setCategories((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  };

  const deleteCategory = async (id) => {
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((x) => x.id !== id));
  };

  const toggleCategoryActive = async (id) => {
    await api.patch(`/categories/${id}/toggle`);
    setCategories((prev) => prev.map((x) => x.id === id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
  };

  return (
    <VideoContext.Provider value={{
      loading,
      videos, models, categories,
      activeVideos, activeModels, activeCategories,
      trendingVideos,
      addVideo, addVideoWithProgress, updateVideo, deleteVideo, toggleVideoActive, incrementViewCount,
      addModel, updateModel, deleteModel, toggleModelActive,
      addCategory, updateCategory, deleteCategory, toggleCategoryActive,
      refetch: fetchAll,
    }}>
      {children}
    </VideoContext.Provider>
  );
};
