/**
 * Centralized API client
 * All fetch calls go through here so auth token is automatically attached.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const API_SUFFIX = '/api';

const ensureApiPath = (inputPath = '') => {
  const cleanPath = inputPath.replace(/\/+$/, '');
  if (!cleanPath || cleanPath === '/') return API_SUFFIX;
  if (cleanPath.endsWith(API_SUFFIX)) return cleanPath;
  return `${cleanPath}${API_SUFFIX}`;
};

const joinUrl = (base, endpoint) => {
  const normalizedBase = String(base || '').replace(/\/+$/, '');
  const normalizedEndpoint = String(endpoint || '').replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedEndpoint}`;
};

const resolveApiBase = () => {
  const envApi = (import.meta.env.VITE_API_URL || '').trim();
  if (!envApi) return API_SUFFIX;
  if (typeof window === 'undefined') return ensureApiPath(envApi);

  try {
    const parsed = new URL(envApi, window.location.origin);
    const pageHostIsLocal = LOCAL_HOSTS.has(window.location.hostname);
    const apiHostIsLocal = LOCAL_HOSTS.has(parsed.hostname);

    // If build-time env points to localhost but page is opened from LAN/public host,
    // force same-origin API so mobile clients do not resolve localhost to themselves.
    if (apiHostIsLocal && !pageHostIsLocal) return API_SUFFIX;

    parsed.pathname = ensureApiPath(parsed.pathname);
    parsed.search = '';
    parsed.hash = '';

    return parsed.origin === window.location.origin
      ? parsed.pathname
      : parsed.toString().replace(/\/+$/, '');
  } catch {
    return API_SUFFIX;
  }
};

export const API = resolveApiBase();

const getToken = () => localStorage.getItem('vip_token');
const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async (method, endpoint, data, isFormData = false) => {
  const headers = {};
  Object.assign(headers, getAuthHeader());
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (data) options.body = isFormData ? data : JSON.stringify(data);

  const res = await fetch(joinUrl(API, endpoint), options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
};

const xhrFormRequest = ({ endpoint, formData, onProgress }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', joinUrl(API, endpoint));

    const authHeader = getAuthHeader().Authorization;
    if (authHeader) xhr.setRequestHeader('Authorization', authHeader);

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(event.loaded / event.total);
    };

    xhr.onload = () => {
      let json = {};
      try {
        json = JSON.parse(xhr.responseText || '{}');
      } catch {
        json = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json);
      } else {
        reject(new Error(json.error || `HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload sirasinda ag hatasi olustu'));
    xhr.send(formData);
  });

const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

export const uploadVideoInChunks = async ({ file, metadata, onProgress }) => {
  if (!file) throw new Error('Video dosyasi gerekli');

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const totalChunks = Math.max(1, Math.ceil(file.size / VIDEO_CHUNK_SIZE));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * VIDEO_CHUNK_SIZE;
    const end = Math.min(file.size, start + VIDEO_CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);

    const fd = new FormData();
    fd.append('chunk', chunkBlob, `${file.name}.part`);
    fd.append('uploadId', uploadId);
    fd.append('chunkIndex', String(chunkIndex));
    fd.append('totalChunks', String(totalChunks));

    await xhrFormRequest({
      endpoint: '/videos/upload/chunk',
      formData: fd,
      onProgress: (chunkRatio) => {
        if (!onProgress) return;
        const overall = ((chunkIndex + chunkRatio) / totalChunks) * 100;
        onProgress(Math.min(99, Math.max(0, Math.round(overall))));
      },
    });
  }

  const createdVideo = await api.post('/videos/upload/complete', {
    uploadId,
    totalChunks,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    ...metadata,
  });

  onProgress?.(100);
  return createdVideo;
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

export const isStreamtapeSource = (value = '') =>
  typeof value === 'string' && /(streamtape\.com|streamta\.pe)/i.test(value);

export const api = {
  get:    (url)              => request('GET',    url),
  post:   (url, data)        => request('POST',   url, data),
  put:    (url, data)        => request('PUT',    url, data),
  patch:  (url, data)        => request('PATCH',  url, data),
  delete: (url)              => request('DELETE', url),
  upload: (url, formData)    => request('POST',   url, formData, true),
  uploadPut: (url, formData) => request('PUT',    url, formData, true),
};

/**
 * Returns the effective playback URL.
 * For Streamtape videos, fetches a freshly resolved URL from backend.
 */
export const getVideoPlaybackUrl = async (video) => {
  if (!video) return '';
  const streamtapeSource = video.streamtape_url || (isStreamtapeSource(video.url) ? video.url : '');
  if (!streamtapeSource) return getSecureVideoUrl(video.url);

  const payload = await api.get(`/videos/${video.id}/playback`);
  return payload?.url || '';
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
