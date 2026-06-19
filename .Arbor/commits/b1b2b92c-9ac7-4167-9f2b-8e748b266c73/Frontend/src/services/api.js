import axios from 'axios';

// ─── Axios Instance ───────────────────────────────────────────
// withCredentials: true ensures the browser automatically sends the HttpOnly
// refreshToken cookie on every request — the frontend never touches it directly.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper: check if a request URL is one we must NEVER intercept.
const isAuthEndpoint = (url = '') =>
  url.includes('/api/auth/login') ||
  url.includes('/api/auth/refresh-token') ||
  url.includes('/api/auth/logout');
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────
// Reads the short-lived accessToken from sessionStorage and attaches it as a
// Bearer header. sessionStorage is cleared on tab close (session isolation).
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Refresh Token Queue ──────────────────────────────────────
// Prevents multiple simultaneous refresh calls when several requests 401
// at the same moment. All queued requests are resolved/rejected together.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor ────────────────────────────────────
// On any 401, silently tries POST /api/auth/refresh-token (the HttpOnly cookie
// is sent automatically by the browser). On success, retries the original
// request with the new token. On failure, dispatches a session-expired event
// that the AuthContext listens for to clear state and redirect.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401s — and only once per request (prevent infinite loops).
    // NEVER intercept 401s from the auth endpoints themselves (login, refresh, logout).
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {

      // If a refresh is already in flight, queue this request to resolve later.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use raw axios (NOT the `api` instance) so the refresh call itself
        // never enters this interceptor — breaks the potential infinite loop.
        const refreshResponse = await axios.post(
          `${BASE_URL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newAccessToken =
          refreshResponse.data?.data?.accessToken ??
          refreshResponse.data?.accessToken;

        if (!newAccessToken) throw new Error('No token in refresh response');

        sessionStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        sessionStorage.removeItem('accessToken');

        // Signal AuthContext to tear down user state and redirect to login.
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
