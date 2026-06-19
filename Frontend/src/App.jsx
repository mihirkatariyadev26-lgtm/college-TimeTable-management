import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { useNotifications } from './hooks/useNotifications';
import Login from './pages/Login';
import AdminRegistration from './pages/AdminRegistration';
import TimetableView from './pages/TimetableView';
import TeacherDashboard from './pages/TeacherDashboard';
import NotificationsTab from './components/NotificationsTab';

// ─── Loading Spinner ──────────────────────────────────────────
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-screen__spinner" />
  </div>
);

// ─── Bell Icon ────────────────────────────────────────────────
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ─── Admin Dashboard ──────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout, registerSocketDisconnect } = useAuth();
  const { connect, disconnect } = useSocket();

  // Connect socket when admin lands on dashboard; disconnect on unmount/logout.
  useEffect(() => {
    connect();
    registerSocketDisconnect(disconnect);
    return () => { /* AuthContext handles disconnect via registerSocketDisconnect */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen screen--dashboard">
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />
      <div className="dashboard-card">
        <h1 className="dashboard-title dashboard-title--admin">Admin Dashboard</h1>
        <p className="dashboard-welcome">Welcome back, <strong>{user?.name}</strong></p>

        <div className="dashboard-nav">
          <Link id="admin-nav-register" to="/admin/register" className="dashboard-nav__item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Register Users
          </Link>
          <Link id="admin-nav-timetable" to="/timetable" className="dashboard-nav__item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Timetable View &amp; Editor
          </Link>
        </div>

        <button className="btn btn--danger" onClick={logout} style={{ marginTop: 'var(--space-4)' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

// ─── Student Dashboard ────────────────────────────────────────
const StudentDashboard = () => {
  const { user, logout, registerSocketDisconnect } = useAuth();
  const { connect, disconnect } = useSocket();

  const [activeTab, setActiveTab] = useState('timetable');

  // Connect socket after dashboard mounts; register disconnect with AuthContext.
  useEffect(() => {
    connect();
    registerSocketDisconnect(disconnect);
    return () => { /* AuthContext handles disconnect */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notifications state lives HERE so the bell badge updates even when not on Notifs tab.
  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  return (
    <div className="screen screen--admin" aria-label="Student Dashboard">
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />

      <div className="admin-panel">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="admin-panel__header">
          <div className="admin-panel__nav">
            <div className="admin-panel__title-row" style={{ marginBottom: 0 }}>
              <div className="brand__icon" style={{ width: '2.5rem', height: '2.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h1 className="admin-panel__title" style={{ fontSize: 'var(--text-xl)' }}>
                  {user?.name}
                </h1>
                <p className="admin-panel__subtitle">
                  Student Dashboard &nbsp;·&nbsp; Sem {user?.semester} Div {user?.division}
                </p>
              </div>
            </div>
            <div className="admin-panel__user">
              <button className="btn-text btn-text--muted" onClick={logout}>Sign out</button>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────────────── */}
          <div className="tab-bar" role="tablist">
            <button
              id="tab-student-timetable"
              role="tab"
              aria-selected={activeTab === 'timetable'}
              className={`tab-bar__tab ${activeTab === 'timetable' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              My Timetable
            </button>

            <button
              id="tab-student-notifs"
              role="tab"
              aria-selected={activeTab === 'notifs'}
              className={`tab-bar__tab ${activeTab === 'notifs' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('notifs')}
              style={{ position: 'relative' }}
            >
              <BellIcon />
              Notifications
              {/* ── Notification Bell Badge ── */}
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'var(--error-color)', color: 'white',
                  borderRadius: '10px', fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="admin-panel__body" role="tabpanel">

          {/* ── TIMETABLE TAB ─────────────────────────────────── */}
          {activeTab === 'timetable' && (
            <div className="tt-redirect-prompt">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div>
                <h3 className="tt-redirect-prompt__title">Your Class Timetable</h3>
                <p className="tt-redirect-prompt__text">
                  View your class schedule, see teacher substitutions, and track daily lecture updates.
                </p>
                <Link to="/timetable" className="btn btn--primary"
                  style={{ width: 'auto', marginTop: 'var(--space-4)', display: 'inline-flex' }}>
                  Open Timetable View
                </Link>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ──────────────────────────────── */}
          {activeTab === 'notifs' && (
            <NotificationsTab
              notifications={notifications}
              unreadCount={unreadCount}
              loading={notifLoading}
              error={notifError}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onRefresh={fetchNotifications}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Protected Route ──────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleHome = {
      Admin:   '/admin/dashboard',
      Teacher: '/teacher/dashboard',
      Student: '/student/dashboard',
    };
    return <Navigate to={roleHome[user.role] ?? '/login'} replace />;
  }

  return children;
};

// ─── App ──────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            {/* ── Public ─────────────────────────────────────── */}
            <Route path="/login" element={<Login />} />

            {/* ── Admin routes ───────────────────────────────── */}
            <Route path="/admin/dashboard"
              element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/admin/register"
              element={<ProtectedRoute allowedRoles={['Admin']}><AdminRegistration /></ProtectedRoute>}
            />

            {/* ── Teacher routes ─────────────────────────────── */}
            <Route path="/teacher/dashboard"
              element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherDashboard /></ProtectedRoute>}
            />

            {/* ── Student routes ─────────────────────────────── */}
            <Route path="/student/dashboard"
              element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>}
            />

            {/* ── Shared timetable view (Admin + Teacher + Student) */}
            <Route path="/timetable"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Teacher', 'Student']}>
                  <TimetableView />
                </ProtectedRoute>
              }
            />

            {/* ── Catch-all ──────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
