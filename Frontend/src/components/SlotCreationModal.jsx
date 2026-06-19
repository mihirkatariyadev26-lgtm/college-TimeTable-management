import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Icons ────────────────────────────────────────────────────
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── SlotCreationModal ────────────────────────────────────────
const SlotCreationModal = ({ isOpen, onClose, onSuccess, prefill = {} }) => {
  const { showToast } = useAuth();
  const [teachers, setTeachers]     = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [form, setForm] = useState({
    dayOfWeek:  prefill.dayOfWeek  || '',
    slotNumber: prefill.slotNumber || '',
    semester:   prefill.semester   || '',
    division:   prefill.division   || '',
    teacherId:  '',
    subject:    '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMsg, setConflictMsg]   = useState('');   // 409 stays open
  const [errorMsg, setErrorMsg]         = useState('');

  // Reset form + fetch teachers when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setConflictMsg('');
    setErrorMsg('');
    setForm({
      dayOfWeek:  prefill.dayOfWeek  || '',
      slotNumber: prefill.slotNumber || '',
      semester:   prefill.semester   || '',
      division:   prefill.division   || '',
      teacherId:  '',
      subject:    '',
    });
    fetchTeachers();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await api.get('/api/auth/users?role=Teacher');
      const list = res.data?.data ?? res.data ?? [];
      setTeachers(Array.isArray(list) ? list : []);
    } catch {
      // If the endpoint doesn't yet return a user list, fall back to empty
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setConflictMsg('');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConflictMsg('');
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        dayOfWeek:  form.dayOfWeek,
        slotNumber: Number(form.slotNumber),
        semester:   Number(form.semester),
        division:   form.division.trim(),
        teacherId:  form.teacherId,
        subject:    form.subject.trim(),
      };

      const res = await api.post('/api/timetable/create', payload);
      onSuccess(res.data?.data ?? res.data);
      onClose();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message ?? 'Something went wrong.';

      if (status === 409) {
        // ── CRITICAL: DO NOT CLOSE on conflict ───────────────
        setConflictMsg(msg);
        showToast(msg, 'error');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true"
      aria-labelledby="modal-title">
      <div className="modal">
        {/* Header */}
        <div className="modal__header">
          <div>
            <h2 id="modal-title" className="modal__title">Add Timetable Slot</h2>
            <p className="modal__subtitle">All fields are required</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <XIcon />
          </button>
        </div>

        {/* 409 Conflict warning — modal STAYS open */}
        {conflictMsg && (
          <div className="modal__conflict" role="alert">
            <AlertTriangleIcon />
            <span>{conflictMsg}</span>
          </div>
        )}

        {/* Generic error */}
        {errorMsg && (
          <div className="modal__error" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          {/* Row 1: Day + Slot */}
          <div className="modal__row">
            <div className="field">
              <label className="field__label" htmlFor="modal-day">Day of Week</label>
              <select id="modal-day" className="field__input field__input--plain field__select"
                required value={form.dayOfWeek} onChange={e => set('dayOfWeek', e.target.value)}
                disabled={isSubmitting}>
                <option value="">— Select day —</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="modal-slot">Slot #</label>
              <select id="modal-slot" className="field__input field__input--plain field__select"
                required value={form.slotNumber} onChange={e => set('slotNumber', e.target.value)}
                disabled={isSubmitting}>
                <option value="">— Slot —</option>
                {SLOTS.map(s => <option key={s} value={s}>Slot {s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Semester + Division */}
          <div className="modal__row">
            <div className="field">
              <label className="field__label" htmlFor="modal-semester">Semester</label>
              <select id="modal-semester" className="field__input field__input--plain field__select"
                required value={form.semester} onChange={e => set('semester', e.target.value)}
                disabled={isSubmitting}>
                <option value="">— Semester —</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="modal-division">Division</label>
              <input id="modal-division" className="field__input field__input--plain"
                type="text" placeholder="e.g. A" required
                value={form.division} onChange={e => set('division', e.target.value)}
                disabled={isSubmitting} />
            </div>
          </div>

          {/* Teacher */}
          <div className="field">
            <label className="field__label" htmlFor="modal-teacher">Teacher</label>
            <select id="modal-teacher" className="field__input field__input--plain field__select"
              required value={form.teacherId} onChange={e => set('teacherId', e.target.value)}
              disabled={isSubmitting || loadingTeachers}>
              <option value="">
                {loadingTeachers ? 'Loading teachers…' : '— Select teacher —'}
              </option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} — {(t.subjectsTaught || []).join(', ')}
                </option>
              ))}
              {!loadingTeachers && teachers.length === 0 && (
                <option disabled>No teachers found — register teachers first</option>
              )}
            </select>
          </div>

          {/* Subject */}
          <div className="field">
            <label className="field__label" htmlFor="modal-subject">Subject</label>
            <input id="modal-subject" className="field__input field__input--plain"
              type="text" placeholder="e.g. Data Structures" required
              value={form.subject} onChange={e => set('subject', e.target.value)}
              disabled={isSubmitting} />
          </div>

          {/* Actions */}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}
              disabled={isSubmitting}>
              Cancel
            </button>
            <button id="modal-submit" type="submit" className="btn btn--primary"
              disabled={isSubmitting} style={{ flex: 1 }}>
              {isSubmitting ? <span className="spinner" /> : <PlusIcon />}
              {isSubmitting ? 'Creating…' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlotCreationModal;
