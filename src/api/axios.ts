import axios from 'axios';
import { logout, setAccessToken } from '@/features/auth/authSlice';
import { refreshAccessToken } from '@/features/auth/authSlice';
import { getDispatch, getState } from '@/utils/setStore';
import toast from 'react-hot-toast';

export const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

/** Base URL for API; fallback to same origin when env is not set (e.g. document proxy). */
export function getApiBaseUrl(): string {
  if (baseURL) return baseURL;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/**
 * Turn relative API paths into full URLs so <audio src> / <img> hit the backend when the app is on another origin.
 * e.g. /api/v1/unipile/attachments/... → https://api.example.com/api/v1/...
 */
export function absolutizeApiUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null || typeof pathOrUrl !== 'string') return null;
  const u = pathOrUrl.trim();
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) return u;
  const base = getApiBaseUrl();
  if (!base) return u;
  return `${base.replace(/\/$/, '')}${u.startsWith('/') ? u : `/${u}`}`;
}

export const api = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
});

// ✅ Attach token to requests
api.interceptors.request.use(
  config => {
    const state = getState(); // 👈 no circular import!
    const token = state.auth.accessToken;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // ngrok free: without this, API may return HTML interstitial instead of JSON/image (QR breaks).
    const apiBase =
      (typeof config.baseURL === 'string' ? config.baseURL : '') || baseURL || '';
    const urlHasNgrok = /ngrok/i.test(String(config.url || ''));
    if ((urlHasNgrok || (apiBase && /ngrok/i.test(apiBase))) && config.headers) {
      (config.headers as Record<string, string>)['ngrok-skip-browser-warning'] = 'true';
    }
    return config;
  },
  error => Promise.reject(error)
);

// 🔁 Refresh token when expired
api.interceptors.response.use(
  response => response,
  async error => {
    console.log("⛔️ Interceptor caught error:", error.response?.status);
    const originalRequest = error.config;

    if (originalRequest?.url?.includes('/refresh-token')) {
      return Promise.reject(error);
    }

    // Handle auth expiry (refresh token -> logout)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const dispatch = getDispatch();
        const { accessToken } = await dispatch(refreshAccessToken()).unwrap();

        dispatch(setAccessToken(accessToken));
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        const dispatch = getDispatch();
        dispatch(logout());
        toast.error('Session expired. Please log in again.');
        window.location.href = '/signin';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);