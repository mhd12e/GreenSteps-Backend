import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from './config';
import { useAuthStore } from './auth-store';
import { toast } from 'sonner';

// Create base instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue for handling multiple 401s during a single refresh cycle
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

// Response interceptor: Handle success and 401/Refresh logic
api.interceptors.response.use(
  (response) => {
    // Standard Envelope unwrapping
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If it's not a 401 or we've already retried this request, just fail
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Start refresh cycle
    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();

    if (!refreshToken) {
      isRefreshing = false;
      clearTokens();
      return Promise.reject(error);
    }

    try {
      // Use basic axios for refresh to avoid interceptor loop
      const response = await axios.post(`${API_BASE}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      // Backend returns Envelope[TokenResponse]
      const newTokens = response.data.data;
      
      // Update global store
      setTokens(newTokens);
      
      // Process the queue with the new token
      processQueue(null, newTokens.access_token);
      
      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
      return api(originalRequest);
    } catch (refreshError: any) {
      // If refresh fails, it's a hard logout
      processQueue(refreshError, null);
      
      const errorData = refreshError.response?.data?.error;
      if (errorData?.code === 'security_breach') {
          toast.error("Security Alert", {
              description: "Your session has been revoked for security reasons. Please log in again.",
              duration: 6000
          });
      }
      
      clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;