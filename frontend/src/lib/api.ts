import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('sentrix-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return config;
});

// Response interceptor: automatically fall back to Vite /api proxy if browser blocks direct cross-origin
api.interceptors.response.use(
  (response) => {
    // If a scan was created, cache it in sentrix_recent_scans for dropdowns and history
    if (response?.config?.url?.match(/scans$/i) && response?.config?.method?.toLowerCase() === 'post') {
      try {
        const createdScan = response.data?.data?.scan;
        if (createdScan && createdScan._id) {
          const raw = localStorage.getItem('sentrix_recent_scans');
          const list = raw ? JSON.parse(raw) : [];
          const updated = [createdScan, ...list.filter((s: any) => s._id !== createdScan._id)].slice(0, 50);
          localStorage.setItem('sentrix_recent_scans', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    if (
      originalRequest &&
      !originalRequest._retry &&
      (!error.response || error.message === 'Network Error')
    ) {
      originalRequest._retry = true;
      originalRequest.baseURL = '/api/v1';
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default api;
