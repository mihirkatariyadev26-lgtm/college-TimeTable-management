import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const InitiateSwapModal = ({ isOpen, onClose, targetSlot, date }) => {
  const { user, showToast } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // My slots
  const [mySlots, setMySlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  
  const [isPermanent, setIsPermanent] = useState(false);
  
  // Domino Wizard State
  const [wizardMode, setWizardMode] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  useEffect(() => {
    if (isOpen && user && date) {
      // Reset state
      setError('');
      setSelectedSlotId('');
      setIsPermanent(false);
      setWizardMode(false);
      setConflictDetails(null);
      setLoading(true);

      const fetchMySlots = async () => {
        try {
          const teacherId = user._id || user.id;
          const res = await api.get(`/api/timetable/teacher/${teacherId}`);
          const data = res.data?.data ?? res.data;
          
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = days[date.getDay()];
          const slotsForDay = data.weeklySchedule?.[dayName] || [];
          
          setMySlots(slotsForDay);
        } catch (err) {
          setError('Failed to load your schedule for this day.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchMySlots();
    }
  }, [isOpen, user, date]);

  if (!isOpen || !targetSlot || !date) return null;

  const handleClose = () => {
    onClose();
  };

  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const formattedDate = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError('Please select one of your slots to swap.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        receiverId: targetSlot.teacher._id,
        originalSlotId: selectedSlotId,
        targetSlotId: targetSlot._id,
        date: toISO(date),
        isPermanent
      };

      const res = await api.post('/api/swaps', payload);
      const data = res.data?.data ?? res.data;

      const warnings = data.validationMatrix || [];
      const dominoWarning = warnings.find(w => w.type === 'DOMINO_WARNING');

      if (dominoWarning) {
        setConflictDetails(dominoWarning);
        setWizardMode(true);
      } else {
        showToast('Swap request sent successfully.', 'success');
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate swap request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareFree = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/api/free-slots/declare', {
        masterSlotId: conflictDetails.conflictingSlotId,
        date: toISO(date)
      });
      showToast('Conflicting slot declared free. Original swap request is active.', 'success');
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to declare slot free.');
      setLoading(false);
    }
  };

  const handleChainSwap = () => {
    showToast('Original swap request created. Please find another slot to swap for your conflict.', 'info');
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {wizardMode ? 'Domino Conflict Detected' : 'Initiate Swap'}
          </h2>
          <button className="btn-icon" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="reg-result-banner reg-result-banner--error">{error}</div>}

          {!wizardMode ? (
            <form id="swap-form" onSubmit={handleSubmit}>
              <div className="tt-grid-wrapper" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}>
                <strong>Target Slot:</strong> {targetSlot.subject} (Slot {targetSlot.slotNumber})
                <br />
                <strong>Teacher:</strong> {targetSlot.teacher?.name}
                <br />
                <strong>Date:</strong> {formattedDate}
              </div>

              <div className="field">
                <label className="field__label">Select your slot to swap</label>
                {loading ? (
                  <p>Loading your slots...</p>
                ) : mySlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>You have no baseline slots scheduled on this day to offer for a swap.</p>
                ) : (
                  <select 
                    className="field__input field__input--plain field__select"
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    required
                  >
                    <option value="">— Select your slot —</option>
                    {mySlots.map(s => (
                      <option key={s._id} value={s._id}>
                        Slot {s.slotNumber}: {s.subject} (Sem {s.semester} Div {s.division})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="field">
                <label className="field__label">Swap Type</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input 
                      type="radio" 
                      name="swapType" 
                      checked={!isPermanent} 
                      onChange={() => setIsPermanent(false)} 
                    />
                    Temporary (Just for this date)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input 
                      type="radio" 
                      name="swapType" 
                      checked={isPermanent} 
                      onChange={() => setIsPermanent(true)} 
                    />
                    Permanent (Update master timetable)
                  </label>
                </div>
              </div>
            </form>
          ) : (
            <div className="domino-wizard">
              <div className="alert alert--warning" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Warning</div>
                <div>{conflictDetails.message}</div>
              </div>

              <p style={{ marginBottom: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                Your swap request to <strong>{targetSlot.teacher?.name}</strong> has been created, but if accepted, you will have two classes at the same time. How would you like to resolve your conflicting slot?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <button 
                  className="btn btn--primary" 
                  onClick={handleDeclareFree} 
                  disabled={loading}
                >
                  {loading ? 'Declaring...' : 'Declare Conflicting Slot as Free'}
                </button>
                <button 
                  className="btn btn--outline" 
                  onClick={handleChainSwap}
                  disabled={loading}
                >
                  Initiate Chain Swap (Find someone else)
                </button>
              </div>
            </div>
          )}
        </div>

        {!wizardMode && (
          <div className="modal-footer">
            <button className="btn btn--text" onClick={handleClose} type="button">Cancel</button>
            <button 
              className="btn btn--primary" 
              form="swap-form" 
              type="submit" 
              disabled={loading || mySlots.length === 0}
            >
              {loading ? 'Submitting...' : 'Request Swap'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitiateSwapModal;
