import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../services/api';

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Role → Route Map ─────────────────────────────────────────
export const ROLE_ROUTES = {
  Admin:   '/admin/dashboard',
  Teacher: '/teacher/dashboard',
  Student: '/student/dashboard',
};

// ─── Provider ────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);  // true until session restore attempt finishes
  const [toast, setToast]     = useState(null);

  // ── Socket disconnect callback (registered by dashboards) ─
  // This lets us close the WebSocket before clearing auth state.
  const socketDisconnectRef = useRef(null);
  const registerSocketDisconnect = useCallback((fn) => {
    socketDisconnectRef.current = fn;
  }, []);

  // ── Toast Helper ──────────────────────────────────────────
  const showToast = useCallback((message, type = 'info', durationMs = 3000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), durationMs);
  }, []);

  // ── Session Destroy Helper (used by both interceptor and logout) ──
  const destroySession = useCallback(() => {
    // Disconnect WebSocket first (if registered).
    if (socketDisconnectRef.current) {
      socketDisconnectRef.current();
      socketDisconnectRef.current = null;
    }
    sessionStorage.clear();
    setUser(null);
  }, []);

  // ── On Mount: Restore Session ─────────────────────────────
  // If an accessToken exists in sessionStorage, call GET /api/auth/me.
  // Success → hydrate the user state without a fresh login.
  // Failure → clear the stale token (the interceptor may have already tried a refresh).
  useEffect(() => {
    const restoreSession = async () => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // The contract: GET /api/auth/me returns the UserProfile in the response body.
        // Backend envelopes: { success: true, data: { ...UserProfile } }
        // or bare: { ...UserProfile } — handle both.
        const response = await api.get('/api/auth/me');
        const profile = response.data?.data ?? response.data;

        if (profile?.id || profile?._id) {
          setUser(profile);
        } else {
          sessionStorage.removeItem('accessToken');
        }
      } catch {
        // The Axios interceptor will have attempted a silent refresh.
        // If we're here the refresh also failed — token is gone, stay logged out.
        sessionStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // ── Listen for Interceptor Session Expiry ──────────────
    // api.js dispatches this when the refresh-token call fails.
    // Give 2 s for the error toast to be visible before hard-redirecting.
    const handleSessionExpired = () => {
      destroySession();
      showToast('Your session has expired. Please log in again.', 'error', 2000);
      setTimeout(() => {
        window.location.replace('/login');
      }, 2000);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [destroySession, showToast]);

  // ── Login ──────────────────────────────────────────────────
  // Contract: POST /api/auth/login → { accessToken, user: UserProfile }
  // On 401 → surface a generic "Invalid credentials" error (do NOT reveal which field).
  const login = async (email, password) => {
    // The contract shows the response body at the top level: { accessToken, user }
    // Some backends wrap in { success, data: { accessToken, user } } — handle both.
    const response = await api.post('/api/auth/login', { email, password });
    const payload  = response.data?.data ?? response.data;

    const { accessToken, user: userData } = payload;

    sessionStorage.setItem('accessToken', accessToken);
    // Sync the default header immediately so subsequent requests in the same
    // tick already carry the new token.
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    setUser(userData);
    showToast(`Welcome back, ${userData.name}!`, 'success');
    return userData;
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Best-effort — always clear client state even if server is unreachable.
    } finally {
      destroySession();
      showToast('Logged out successfully.', 'info');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showToast, registerSocketDisconnect }}>
      {children}

      {/* ── Global Toast ── */}
      {toast && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className={`toast toast--${toast.type}`} key={toast.id}>
            {toast.type === 'success' && <CheckIcon />}
            {toast.type === 'error'   && <AlertIcon />}
            {toast.type === 'info'    && <InfoIcon />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

// ─── Inline SVG Icons for Toast (no icon lib dependency) ─────
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
