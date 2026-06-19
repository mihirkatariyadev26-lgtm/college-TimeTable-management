import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DeclareAbsenceModal = ({ isOpen, onClose, slot, onSuccess }) => {
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useAuth();

  if (!isOpen || !slot) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Please select a date');
      return;
    }
    const d = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (days[d.getUTCDay()] !== slot.dayOfWeek) {
      setError(`The selected date must be a ${slot.dayOfWeek}`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/api/free-slots/declare', { masterSlotId: slot._id, date });
      showToast('Absence declared successfully', 'success');
      onSuccess(slot._id, date);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to declare absence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Declare Absence</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          You are declaring absence for <strong>Slot {slot.slotNumber}</strong> ({slot.subject}) on <strong>{slot.dayOfWeek}</strong>.
        </p>
        
        {error && <div className="reg-result-banner reg-result-banner--error" style={{ marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Date of Absence</label>
            <input 
              type="date" 
              className="field__input field__input--plain"
              value={date} 
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading && <div className="loading-screen__spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />}
              {loading ? 'Declaring...' : 'Declare Absence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeclareAbsenceModal;
