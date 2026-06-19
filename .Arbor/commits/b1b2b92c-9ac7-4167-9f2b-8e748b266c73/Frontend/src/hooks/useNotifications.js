import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

/**
 * useNotifications
 *
 * Must be called inside a component wrapped by <SocketProvider>.
 * Manages:
 *  - Initial load via GET /api/notifications → seeds unreadCount from meta.unreadCount
 *  - Silent real-time badge increment via WebSocket `notification:new` event
 *  - Optimistic mark-as-read (PUT /{id}/read) with rollback
 *  - Optimistic mark-all-as-read (PUT /read-all) with rollback
 */
export const useNotifications = () => {
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // ── Fetch from REST ────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await api.get('/api/notifications');
      // The backend wraps: { success, data: [...], meta: { unreadCount, ... } }
      const body = res.data?.data ?? res.data;
      const meta = res.data?.meta ?? {};

      const items   = Array.isArray(body) ? body : [];
      const initial = typeof meta.unreadCount === 'number' ? meta.unreadCount : 0;

      setNotifications(items);
      setUnreadCount(initial);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Real-time WebSocket listener ───────────────────────────────────────────
  // We subscribe to the socket instance stored in the ref.
  // The dependency on socket ensures we re-attach when the socket reconnects.
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const handleNew = (payload) => {
      // Silently prepend the new notification and increment badge.
      // NO toast popup — spec requirement.
      setNotifications((prev) => [payload, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    sock.on('notification:new', handleNew);
    return () => sock.off('notification:new', handleNew);
  // socket.current changes when connect/disconnect are called, so we track socket (the ref object).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, socket.current]);

  // ── Mark single notification as read ──────────────────────────────────────
  const markRead = useCallback(async (notifId) => {
    // Optimistic update.
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) =>
      prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
    );

    try {
      await api.put(`/api/notifications/${notifId}/read`);
    } catch {
      // Roll back.
      setUnreadCount((c) => c + 1);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const snapshot = { unreadCount, notifications };

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await api.put('/api/notifications/read-all');
    } catch {
      // Roll back.
      setUnreadCount(snapshot.unreadCount);
      setNotifications(snapshot.notifications);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  };
};
