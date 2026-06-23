import React, { useState, useEffect } from 'react';
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
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─── SlotEditModal ────────────────────────────────────────
const SlotEditModal = ({ isOpen, onClose, onSuccess, slot, dayOfWeek, semester, division }) => {
  const { showToast } = useAuth();
  const [teachers, setTeachers]     = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [form, setForm] = useState({
    dayOfWeek:  dayOfWeek  || '',
    slotNumber: slot?.slotNumber || '',
    semester:   semester   || '',
    division:   division   || '',
    teacherId:  slot?.teacher?._id || slot?.teacher || '',
    subject:    slot?.subject || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [conflictMsg, setConflictMsg]   = useState('');
  const [errorMsg, setErrorMsg]         = useState('');

  useEffect(() => {
    if (!isOpen || !slot) return;
    setConflictMsg('');
    setErrorMsg('');
    setForm({
      dayOfWeek:  dayOfWeek  || '',
      slotNumber: slot?.slotNumber || '',
      semester:   semester   || '',
      division:   division   || '',
      teacherId:  slot?.teacher?._id || slot?.teacher || '',
      subject:    slot?.subject || '',
    });
    fetchTeachers();
  }, [isOpen, slot, dayOfWeek, semester, division]);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await api.get('/api/auth/users?role=Teacher');
      const list = res.data?.data ?? res.data ?? [];
      setTeachers(Array.isArray(list) ? list : []);
    } catch {
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
    if (!slot?._id) return;

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

      const res = await api.put(`/api/timetable/update/${slot._id}`, payload);
      onSuccess(res.data?.data ?? res.data, 'updated');
      onClose();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message ?? 'Something went wrong.';

      if (status === 409) {
        setConflictMsg(msg);
        showToast(msg, 'error');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!slot?._id) return;
    if (!window.confirm('Are you sure you want to delete this slot?')) return;

    setConflictMsg('');
    setErrorMsg('');
    setIsDeleting(true);

    try {
      await api.delete(`/api/timetable/delete/${slot._id}`);
      onSuccess(slot, 'deleted');
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to delete slot.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !slot) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true"
      aria-labelledby="modal-title">
      <div className="modal">
        {/* Header */}
        <div className="modal__header">
          <div>
            <h2 id="modal-title" className="modal__title">Edit Timetable Slot</h2>
            <p className="modal__subtitle">Update or remove this slot</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <XIcon />
          </button>
        </div>

        {conflictMsg && (
          <div className="modal__conflict" role="alert">
            <AlertTriangleIcon />
            <span>{conflictMsg}</span>
          </div>
        )}

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
                disabled={isSubmitting || isDeleting}>
                <option value="">— Select day —</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="modal-slot">Slot #</label>
              <select id="modal-slot" className="field__input field__input--plain field__select"
                required value={form.slotNumber} onChange={e => set('slotNumber', e.target.value)}
                disabled={isSubmitting || isDeleting}>
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
                disabled={isSubmitting || isDeleting}>
                <option value="">— Semester —</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="modal-division">Division</label>
              <input id="modal-division" className="field__input field__input--plain"
                type="text" placeholder="e.g. A" required
                value={form.division} onChange={e => set('division', e.target.value)}
                disabled={isSubmitting || isDeleting} />
            </div>
          </div>

          {/* Teacher */}
          <div className="field">
            <label className="field__label" htmlFor="modal-teacher">Teacher</label>
            <select id="modal-teacher" className="field__input field__input--plain field__select"
              required value={form.teacherId} onChange={e => set('teacherId', e.target.value)}
              disabled={isSubmitting || isDeleting || loadingTeachers}>
              <option value="">
                {loadingTeachers ? 'Loading teachers…' : '— Select teacher —'}
              </option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} — {(t.subjectsTaught || []).join(', ')}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="field">
            <label className="field__label" htmlFor="modal-subject">Subject</label>
            <input id="modal-subject" className="field__input field__input--plain"
              type="text" placeholder="e.g. Data Structures" required
              value={form.subject} onChange={e => set('subject', e.target.value)}
              disabled={isSubmitting || isDeleting} />
          </div>

          {/* Actions */}
          <div className="modal__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--danger" onClick={handleDelete}
              disabled={isSubmitting || isDeleting} style={{ flex: '1', minWidth: '120px', backgroundColor: '#e53e3e', color: 'white', border: 'none' }}>
              {isDeleting ? <span className="spinner" /> : <TrashIcon />}
              Delete Slot
            </button>
            <div style={{ display: 'flex', gap: '1rem', flex: '2', justifyContent: 'flex-end', minWidth: '200px' }}>
              <button type="button" className="btn btn--ghost" onClick={onClose}
                disabled={isSubmitting || isDeleting}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary"
                disabled={isSubmitting || isDeleting}>
                {isSubmitting ? <span className="spinner" /> : <EditIcon />}
                {isSubmitting ? 'Updating…' : 'Update Slot'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlotEditModal;
