import React from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────
const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CheckAllIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
    <polyline points="20 12 13 19 10 16" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Relative time helper ─────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ─── Notification type → color map ───────────────────────────────────────────
const TYPE_COLORS = {
  swap_request:  'var(--accent-violet)',
  swap_approved: 'var(--accent-emerald)',
  swap_rejected: 'var(--error-color)',
  absence:       'var(--warning-color, #f59e0b)',
  general:       'var(--accent-indigo)',
};
const typeColor = (type = '') =>
  TYPE_COLORS[type.toLowerCase()] ?? 'var(--accent-indigo)';

// ─── Single Notification Item ─────────────────────────────────────────────────
const NotifItem = ({ notif, onMarkRead }) => {
  const isUnread = !notif.isRead;
  return (
    <div
      className={`notif-item ${isUnread ? 'notif-item--unread' : ''}`}
      onClick={() => isUnread && onMarkRead(notif._id)}
      role={isUnread ? 'button' : undefined}
      tabIndex={isUnread ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && isUnread && onMarkRead(notif._id)}
      aria-label={isUnread ? `Mark notification as read` : notif.message}
    >
      {/* Unread indicator dot */}
      <span
        className="notif-item__dot"
        style={{
          background: isUnread ? typeColor(notif.type) : 'transparent',
          border: isUnread ? 'none' : '1.5px solid var(--border-color)',
        }}
      />
      <div className="notif-item__content">
        <p className="notif-item__message">{notif.message}</p>
        <span className="notif-item__meta">
          <span className="notif-item__type" style={{ color: typeColor(notif.type) }}>
            {notif.type?.replace(/_/g, ' ')}
          </span>
          &nbsp;·&nbsp;
          {relativeTime(notif.createdAt)}
        </span>
      </div>
      {isUnread && (
        <button
          className="notif-item__read-btn"
          onClick={(e) => { e.stopPropagation(); onMarkRead(notif._id); }}
          title="Mark as read"
          aria-label="Mark as read"
        >
          ✓
        </button>
      )}
    </div>
  );
};

// ─── Notifications Tab ────────────────────────────────────────────────────────
/**
 * Props (all controlled from parent, which hosts useNotifications):
 *   notifications  {Array}
 *   unreadCount    {number}
 *   loading        {boolean}
 *   error          {string}
 *   onMarkRead     {(id) => void}
 *   onMarkAllRead  {() => void}
 *   onRefresh      {() => void}
 */
const NotificationsTab = ({
  notifications = [],
  unreadCount   = 0,
  loading       = false,
  error         = '',
  onMarkRead,
  onMarkAllRead,
  onRefresh,
}) => (
  <div>
    {/* ── Header ────────────────────────────────────────────────────────── */}
    <div className="tt-tab-header">
      <div>
        <h2 className="tt-tab-title">Notifications</h2>
        <p className="tt-tab-subtitle">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'You\'re all caught up!'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {unreadCount > 0 && (
          <button
            id="btn-mark-all-read"
            className="btn-icon"
            onClick={onMarkAllRead}
            title="Mark all as read"
          >
            <CheckAllIcon /> Mark all read
          </button>
        )}
        <button className="btn-icon" onClick={onRefresh}>
          <RefreshIcon /> Refresh
        </button>
      </div>
    </div>

    {/* ── Loading ──────────────────────────────────────────────────────── */}
    {loading && (
      <div className="tt-loading">
        <div className="loading-screen__spinner" style={{ width: '2rem', height: '2rem' }} />
        <span>Loading notifications…</span>
      </div>
    )}

    {/* ── Error ────────────────────────────────────────────────────────── */}
    {error && !loading && (
      <div className="reg-result-banner reg-result-banner--error">{error}</div>
    )}

    {/* ── Empty ────────────────────────────────────────────────────────── */}
    {!loading && !error && notifications.length === 0 && (
      <div className="tt-empty-prompt" style={{ flexDirection: 'column', gap: 'var(--space-3)' }}>
        <BellIcon />
        <span>No notifications yet. You're all set!</span>
      </div>
    )}

    {/* ── List ─────────────────────────────────────────────────────────── */}
    {!loading && notifications.length > 0 && (
      <div className="notif-list">
        {notifications.map((n) => (
          <NotifItem key={n._id} notif={n} onMarkRead={onMarkRead} />
        ))}
      </div>
    )}
  </div>
);

export default NotificationsTab;
