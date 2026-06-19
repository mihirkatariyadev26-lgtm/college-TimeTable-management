import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';

// ─── Context ─────────────────────────────────────────────────────────────────
const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Provider ─────────────────────────────────────────────────────────────────
/**
 * Manages the Socket.io connection lifecycle.
 *
 * Rules:
 *  - connect()  must be called AFTER the user has landed on their dashboard
 *               (i.e. once we have a valid accessToken).
 *  - disconnect() is called on logout or session-expiry.
 *  - The socket authenticates via `auth.token` (read from sessionStorage at
 *    connection time); the server's JWT middleware validates it and attaches
 *    `socket.user`.
 */
export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // ── connect ────────────────────────────────────────────────────────────────
  // Called by each role-specific dashboard's useEffect, AFTER auth is confirmed.
  const connect = useCallback(() => {
    // Idempotent — skip if already open.
    if (socketRef.current?.connected) return;

    const token = sessionStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socketRef.current = socket;
  }, []);

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      console.log('[Socket] Disconnected by client.');
    }
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef, isConnected, connect, disconnect }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within <SocketProvider>');
  return ctx;
};
