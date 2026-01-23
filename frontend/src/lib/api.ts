import axios from 'axios';
import { API_BASE } from './config';
import { useAuthStore } from './auth-store';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add access token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 & Refresh
api.interceptors.response.use(
  (response) => {
    // Unwrap Envelope if present
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();

        if (!refreshToken) {
            clearTokens();
            return Promise.reject(error);
        }

        // Call refresh endpoint directly to avoid interceptor loop
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newTokens = refreshResponse.data.data; // Envelope structure
        setTokens(newTokens);

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearTokens();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
