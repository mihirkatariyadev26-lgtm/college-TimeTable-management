import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../hooks/useNotifications';
import api from '../services/api';
import SwapRequestsTab from '../components/SwapRequestsTab';
import FreeSlotsTab from '../components/FreeSlotsTab';
import DeclareAbsenceModal from '../components/DeclareAbsenceModal';
import NotificationsTab from '../components/NotificationsTab';

// ─── Icons ────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SwapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── Weekly Schedule Grid ─────────────────────────────────────
const WeeklyScheduleGrid = ({ weeklySchedule, teacherName, upcomingAbsences = [], onDeclareAbsenceClick }) => {
  const hasAny = DAYS.some(d => (weeklySchedule[d] ?? []).length > 0);

  if (!hasAny) {
    return (
      <div className="tt-empty-prompt">
        No baseline slots scheduled yet. Ask an Admin to create timetable entries.
      </div>
    );
  }

  return (
    <div className="tt-grid-wrapper">
      <div className="tt-grid">
        {/* Header */}
        <div className="tt-grid__corner">Slot</div>
        {DAYS.map(d => (
          <div key={d} className="tt-grid__day-header">
            <span className="tt-grid__day-name">{d}</span>
          </div>
        ))}

        {/* Rows */}
        {SLOTS.map(slotNum => (
          <React.Fragment key={slotNum}>
            <div className="tt-grid__slot-label">S{slotNum}</div>
            {DAYS.map(day => {
              const daySlots = weeklySchedule[day] ?? [];
              const slot = daySlots.find(s => s.slotNumber === slotNum);
              
              const slotAbsences = slot ? upcomingAbsences.filter(a => 
                a.slotNumber === slot.slotNumber && 
                a.semester === slot.semester && 
                a.division === slot.division &&
                new Date(a.date).getUTCDay() === DAYS.indexOf(day) + 1
              ) : [];

              return (
                <div key={day} className="tt-grid__cell">
                  {slot ? (
                    <div className={`slot-card slot-card--active slot-card--teacher ${slotAbsences.length > 0 ? 'slot-card--override' : ''}`}>
                      <div className="slot-card__subject">{slot.subject}</div>
                      <div className="slot-card__teacher">
                        Sem {slot.semester} • Div {slot.division}
                      </div>
                      
                      {slotAbsences.length > 0 && (
                        <div style={{ marginTop: '0.5rem', color: 'var(--error-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Awaiting Cover:<br/>
                          {slotAbsences.map(a => new Date(a.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})).join(', ')}
                        </div>
                      )}
                      
                      <button 
                        className="btn btn--outline" 
                        style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.4rem', height: 'auto' }}
                        onClick={() => onDeclareAbsenceClick({...slot, dayOfWeek: day})}
                      >
                        Declare Absence
                      </button>
                    </div>
                  ) : (
                    <div className="tt-grid__cell-empty">—</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ─── Teacher Dashboard ────────────────────────────────────────
const TeacherDashboard = () => {
  const { user, logout, registerSocketDisconnect } = useAuth();
  const { connect, disconnect } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('schedule');
  const [schedule, setSchedule]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  
  const [pendingSwapsCount, setPendingSwapsCount] = useState(0);
  const [upcomingAbsences, setUpcomingAbsences] = useState([]);
  const [absenceModalSlot, setAbsenceModalSlot] = useState(null);

  const teacherId = user?._id ?? user?.id;

  // ── Connect Socket on mount, register disconnect with AuthContext ──────────
  // The socket MUST connect only after the user lands on the dashboard.
  useEffect(() => {
    connect();
    registerSocketDisconnect(disconnect);
    return () => { /* AuthContext handles disconnect via registerSocketDisconnect */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notifications (badge lives here, not inside the tab) ──────────────────
  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  // ── Schedule & swap data ──────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    setError('');
    try {
      const res  = await api.get(`/api/timetable/teacher/${teacherId}`);
      const data = res.data?.data ?? res.data;
      setSchedule(data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load your schedule.');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const fetchPendingSwapsCount = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await api.get('/api/swaps/pending');
      const pendingSwaps = res.data?.data || res.data || [];
      const requestsForMe = pendingSwaps.filter(s => s.receiverId?._id === teacherId || s.receiverId === teacherId);
      setPendingSwapsCount(requestsForMe.length);
    } catch (err) {
      console.error('Failed to fetch pending swaps count', err);
    }
  }, [teacherId]);

  const fetchUpcomingAbsences = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await api.get('/api/free-slots');
      const freeSlots = res.data?.data || res.data || [];
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const myUpcoming = freeSlots.filter(s => 
        (s.originalTeacherId?._id === teacherId || s.originalTeacherId === teacherId) && 
        new Date(s.date) >= today
      );
      setUpcomingAbsences(myUpcoming);
    } catch (err) {
      console.error('Failed to fetch upcoming absences', err);
    }
  }, [teacherId]);

  useEffect(() => { 
    fetchSchedule(); 
    fetchPendingSwapsCount();
    fetchUpcomingAbsences();
    
    const handleUpdateCount = () => fetchPendingSwapsCount();
    window.addEventListener('swaps:update-count', handleUpdateCount);
    return () => window.removeEventListener('swaps:update-count', handleUpdateCount);
  }, [fetchSchedule, fetchPendingSwapsCount, fetchUpcomingAbsences]);

  return (
    <div className="screen screen--admin" aria-label="Teacher Dashboard">
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />

      <div className="admin-panel">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="admin-panel__header">
          <div className="admin-panel__nav">
            <div className="admin-panel__title-row" style={{ marginBottom: 0 }}>
              <div className="brand__icon" style={{ width: '2.5rem', height: '2.5rem' }}>
                <UserIcon />
              </div>
              <div>
                <h1 className="admin-panel__title" style={{ fontSize: 'var(--text-xl)' }}>
                  {user?.name}
                </h1>
                <p className="admin-panel__subtitle">Teacher Dashboard</p>
              </div>
            </div>
            <div className="admin-panel__user">
              {(user?.subjectsTaught ?? []).length > 0 && (
                <span className="teacher-subjects">
                  {user.subjectsTaught.join(' · ')}
                </span>
              )}
              <button className="btn-text btn-text--muted" onClick={logout}>Sign out</button>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────────── */}
          <div className="tab-bar" role="tablist">
            <button
              id="tab-schedule"
              role="tab"
              aria-selected={activeTab === 'schedule'}
              className={`tab-bar__tab ${activeTab === 'schedule' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <CalendarIcon /> My Schedule
            </button>
            <button
              id="tab-timetable"
              role="tab"
              aria-selected={activeTab === 'timetable'}
              className={`tab-bar__tab ${activeTab === 'timetable' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              <CalendarIcon /> Class Timetable
            </button>
            <button
              id="tab-swaps"
              role="tab"
              aria-selected={activeTab === 'swaps'}
              className={`tab-bar__tab ${activeTab === 'swaps' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('swaps')}
              style={{ position: 'relative' }}
            >
              <SwapIcon /> Swap Requests
              {pendingSwapsCount > 0 && (
                <span style={{
                  position: 'absolute', top: '8px', right: '8px', background: 'var(--error-color)', color: 'white',
                  borderRadius: '10px', fontSize: '0.7rem', padding: '2px 6px', fontWeight: 'bold'
                }}>
                  {pendingSwapsCount}
                </span>
              )}
            </button>
            <button
              id="tab-freeslots"
              role="tab"
              aria-selected={activeTab === 'freeslots'}
              className={`tab-bar__tab ${activeTab === 'freeslots' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('freeslots')}
            >
              <RefreshIcon /> Marketplace
            </button>
            <button
              id="tab-notifs"
              role="tab"
              aria-selected={activeTab === 'notifs'}
              className={`tab-bar__tab ${activeTab === 'notifs' ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveTab('notifs')}
              style={{ position: 'relative' }}
            >
              <BellIcon /> Notifications
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

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="admin-panel__body" role="tabpanel">

          {/* ── MY SCHEDULE TAB ──────────────────────────── */}
          {activeTab === 'schedule' && (
            <div>
              <div className="tt-tab-header">
                <div>
                  <h2 className="tt-tab-title">Weekly Schedule</h2>
                  <p className="tt-tab-subtitle">Your personal lecture assignments for the week</p>
                </div>
                <button className="btn-icon" onClick={fetchSchedule}>
                  <RefreshIcon /> Refresh
                </button>
              </div>

              {loading && (
                <div className="tt-loading">
                  <div className="loading-screen__spinner" style={{ width: '2rem', height: '2rem' }} />
                  <span>Loading schedule…</span>
                </div>
              )}

              {error && !loading && (
                <div className="reg-result-banner reg-result-banner--error">
                  {error}
                </div>
              )}

              {!loading && !error && schedule && (
                <>
                  {/* Summary pills */}
                  <div className="teacher-summary">
                    {DAYS.map(d => {
                      const count = (schedule.weeklySchedule?.[d] ?? []).length;
                      return count > 0 ? (
                        <div key={d} className="teacher-summary__pill">
                          <span className="teacher-summary__day">{d.slice(0, 3)}</span>
                          <span className="teacher-summary__count">{count} slot{count > 1 ? 's' : ''}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="teacher-summary__pill teacher-summary__pill--total">
                      <span className="teacher-summary__day">Total</span>
                      <span className="teacher-summary__count">
                        {DAYS.reduce((acc, d) => acc + (schedule.weeklySchedule?.[d] ?? []).length, 0)} slots/wk
                      </span>
                    </div>
                  </div>

                  <WeeklyScheduleGrid
                    weeklySchedule={schedule.weeklySchedule ?? {}}
                    teacherName={schedule.teacher?.name}
                    upcomingAbsences={upcomingAbsences}
                    onDeclareAbsenceClick={setAbsenceModalSlot}
                  />
                </>
              )}
            </div>
          )}

          {/* ── CLASS TIMETABLE TAB ───────────────────────── */}
          {activeTab === 'timetable' && (
            <div className="tt-redirect-prompt">
              <CalendarIcon />
              <div>
                <h3 className="tt-redirect-prompt__title">Full Timetable View</h3>
                <p className="tt-redirect-prompt__text">
                  Browse per-class schedules with daily or weekly views, and see all exceptions and overrides.
                </p>
                <Link to="/timetable" className="btn btn--primary" style={{ width: 'auto', marginTop: 'var(--space-4)', display: 'inline-flex' }}>
                  Open Timetable View
                </Link>
              </div>
            </div>
          )}

          {/* ── SWAPS TAB ───────────────────────── */}
          {activeTab === 'swaps' && (
            <SwapRequestsTab />
          )}

          {/* ── MARKETPLACE TAB ─────────────────────────── */}
          {activeTab === 'freeslots' && (
            <FreeSlotsTab />
          )}

          {/* ── NOTIFICATIONS TAB ────────────────────────── */}
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
      
      <DeclareAbsenceModal 
        isOpen={!!absenceModalSlot}
        onClose={() => setAbsenceModalSlot(null)}
        slot={absenceModalSlot}
        onSuccess={() => fetchUpcomingAbsences()}
      />
    </div>
  );
};

export default TeacherDashboard;
