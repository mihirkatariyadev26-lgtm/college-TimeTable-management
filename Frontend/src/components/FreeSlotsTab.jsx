import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FreeSlotsTab = () => {
  const { user, showToast } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [claimingId, setClaimingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const fetchFreeSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/free-slots');
      setSlots(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load free slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFreeSlots();
  }, [fetchFreeSlots]);

  const handleClaim = async (exceptionId) => {
    setClaimingId(exceptionId);
    try {
      await api.post(`/api/free-slots/${exceptionId}/claim`);
      showToast('Free slot claimed successfully', 'success');
      fetchFreeSlots();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        showToast('This slot was just claimed by someone else.', 'error');
        fetchFreeSlots(); // Refresh list to remove claimed slot
      } else {
        showToast(err.response?.data?.message || 'Failed to claim slot', 'error');
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handleRevoke = async (exceptionId) => {
    setRevokingId(exceptionId);
    try {
      await api.delete(`/api/free-slots/${exceptionId}/revoke`);
      showToast('Absence declaration revoked successfully', 'success');
      fetchFreeSlots();
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 409) {
        showToast('This slot has already been picked up by another teacher and cannot be revoked.', 'error');
        fetchFreeSlots();
      } else {
        showToast(err.response?.data?.message || 'Failed to revoke slot', 'error');
      }
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const currentUserId = user?._id || user?.id;

  return (
    <div>
      <div className="tt-tab-header">
        <div>
          <h2 className="tt-tab-title">Free Lecture Marketplace</h2>
          <p className="tt-tab-subtitle">Browse and claim available free slots or manage your declared absences</p>
        </div>
        <button className="btn-icon" onClick={fetchFreeSlots}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg> Refresh
        </button>
      </div>

      {error && <div className="reg-result-banner reg-result-banner--error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="tt-loading">
          <div className="loading-screen__spinner" style={{ width: '2rem', height: '2rem' }} />
          <span>Loading marketplace...</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="tt-empty-prompt">No free slots currently available.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {slots.map(slot => {
            const isMine = slot.originalTeacherId?._id === currentUserId;
            return (
              <div key={slot._id} className="swap-card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)', fontSize: '1.1rem' }}>
                    {formatDate(slot.date)} • Slot {slot.slotNumber}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 'var(--space-2)' }}>
                    <strong>Subject:</strong> {slot.subject} <br />
                    <strong>Sem/Div:</strong> {slot.semester} - {slot.division} <br />
                    <strong>Original Teacher:</strong> {slot.originalTeacherId?.name} {isMine ? '(You)' : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {isMine ? (
                    <button 
                      className="btn btn--outline" 
                      onClick={() => handleRevoke(slot._id)}
                      disabled={revokingId === slot._id}
                      style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {revokingId === slot._id && <div className="loading-screen__spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px', borderTopColor: 'var(--error-color)' }} />}
                      {revokingId === slot._id ? 'Revoking...' : 'Revoke'}
                    </button>
                  ) : (
                    <button 
                      className="btn btn--primary" 
                      onClick={() => handleClaim(slot._id)}
                      disabled={claimingId === slot._id}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {claimingId === slot._id && <div className="loading-screen__spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />}
                      {claimingId === slot._id ? 'Claiming...' : 'Claim Slot'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FreeSlotsTab;
