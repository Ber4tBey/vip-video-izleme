/**
 * Centralized API client
 * All fetch calls go through here so auth token is automatically attached.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const resolveApiBase = () => {
  const envApi = (import.meta.env.VITE_API_URL || '').trim();
  if (!envApi) return '/api';
  if (typeof window === 'undefined') return envApi;

  try {
    const parsed = new URL(envApi, window.location.origin);
    const pageHostIsLocal = LOCAL_HOSTS.has(window.location.hostname);
    const apiHostIsLocal = LOCAL_HOSTS.has(parsed.hostname);

    // If build-time env points to localhost but page is opened from LAN/public host,
    // force same-origin API so mobile clients do not resolve localhost to themselves.
    if (apiHostIsLocal && !pageHostIsLocal) return '/api';

    return parsed.origin === window.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();
  } catch {
    return '/api';
  }
};

export const API = resolveApiBase();

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

  let mediaBase = API.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(API, window.location.origin);
      parsed.pathname = parsed.pathname.replace(/\/api\/?$/, '');
      parsed.search = '';
      parsed.hash = '';
      mediaBase = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      mediaBase = window.location.origin;
    }
  }

  return `${mediaBase}${path.startsWith('/') ? path : `/${path}`}`;
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
