import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api;
