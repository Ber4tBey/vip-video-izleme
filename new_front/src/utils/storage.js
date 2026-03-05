// src/utils/storage.js
// localStorage helper utilities

export const STORAGE_KEYS = {
  USERS: 'vip_users',
  VIDEOS: 'vip_videos',
  MODELS: 'vip_models',
  CATEGORIES: 'vip_categories',
  AGE_VERIFIED: 'vip_age_verified',
  CURRENT_USER: 'vip_current_user',
};

export const getItem = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);
