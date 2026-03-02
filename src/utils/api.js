/**
 * Centralized API client
 * All fetch calls go through here so auth token is automatically attached.
 */

export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('vip_token');

const request = async (method, endpoint, data, isFormData = false) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (data) options.body = isFormData ? data : JSON.stringify(data);

  const res = await fetch(`${API}${endpoint}`, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
};

/**
 * Returns the full absolute URL for a given media path (like /uploads/videos/123.mp4).
 * Strips /api from the VITE_API_URL since uploads are mounted at the root.
 */
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // If API is http://localhost:3001/api, we want http://localhost:3001
  const baseUrl = API.replace(/\/api\/?$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Returns the secure absolute URL for video playing.
 * Appends the JWT token as a query parameter so the backend can authorize the stream request.
 */
export const getSecureVideoUrl = (path) => {
  const url = getMediaUrl(path);
  if (!url) return '';
  const token = getToken();
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${token}`;
  }
  return url;
};

export const api = {
  get:    (url)              => request('GET',    url),
  post:   (url, data)        => request('POST',   url, data),
  put:    (url, data)        => request('PUT',    url, data),
  patch:  (url, data)        => request('PATCH',  url, data),
  delete: (url)              => request('DELETE', url),
  upload: (url, formData)    => request('POST',   url, formData, true),
  uploadPut: (url, formData) => request('PUT',    url, formData, true),
};

/** Upload a File object, returns the server URL */
export const uploadFile = async (file, type = 'image') => {
  const endpoint = type === 'video' ? '/videos' : null;
  // For standalone image upload (model/category/ad images),
  // use a FormData and pass to the right resource route.
  // This helper is used by FileUpload when calling a specific resource.
  const fd = new FormData();
  fd.append(type, file);
  // fallback — caller should use api.upload() with correct endpoint directly
  return fd;
};

export default api;
