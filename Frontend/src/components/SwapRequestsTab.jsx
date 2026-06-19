import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SwapRequestsTab = () => {
  const { user, showToast } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState('pending');
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [historySwaps, setHistorySwaps] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');

  const fetchSwaps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeSubTab === 'pending') {
        const res = await api.get('/api/swaps/pending');
        setPendingSwaps(res.data?.data || res.data || []);
      } else {
        const res = await api.get('/api/swaps/history');
        setHistorySwaps(res.data?.data || res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to load ${activeSubTab} swaps.`);
    } finally {
      setLoading(false);
    }
  }, [activeSubTab]);

  useEffect(() => {
    fetchSwaps();
  }, [fetchSwaps]);

  const handleRespond = async (swapId, status) => {
    setActionLoadingId(swapId);
    try {
      await api.post(`/api/swaps/${swapId}/respond`, { status });
      showToast(`Swap request ${status.toLowerCase()} successfully`, 'success');
      // Remove from pending list
      setPendingSwaps(prev => prev.filter(s => s._id !== swapId));
      
      // Update badge by dispatching event if needed, but since we are refetching or updating state, 
      // we can let the parent handle the badge if we lift the count up, or just rely on the badge updating from a context.
      // Currently, badge count is asked for in requirements: "Use the total count of pending swaps to drive a secondary badge on the Swaps navigation item. Once approved/rejected, remove the card from the list and update the badge count."
      // Since badge count is in the parent `TeacherDashboard`, we should fire a custom event to update it.
      window.dispatchEvent(new CustomEvent('swaps:update-count'));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to respond to swap request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div>
      <div className="tt-tab-header">
        <div>
          <h2 className="tt-tab-title">Swap Requests</h2>
          <p className="tt-tab-subtitle">Manage your incoming and outgoing class swap requests</p>
        </div>
      </div>

      <div className="tab-bar tab-bar--sub" style={{ marginBottom: 'var(--space-6)' }}>
        <button 
          className={`tab-bar__tab ${activeSubTab === 'pending' ? 'tab-bar__tab--active' : ''}`}
          onClick={() => setActiveSubTab('pending')}
        >
          Pending
        </button>
        <button 
          className={`tab-bar__tab ${activeSubTab === 'history' ? 'tab-bar__tab--active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          History
        </button>
      </div>

      {error && <div className="reg-result-banner reg-result-banner--error">{error}</div>}
      
      {loading ? (
        <div className="tt-loading">
          <div className="loading-screen__spinner" style={{ width: '2rem', height: '2rem' }} />
          <span>Loading {activeSubTab} swaps...</span>
        </div>
      ) : activeSubTab === 'pending' ? (
        <div className="swaps-list">
          {pendingSwaps.length === 0 ? (
            <div className="tt-empty-prompt">No pending swap requests found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {pendingSwaps.map(swap => {
                const isReceiver = swap.receiverId?._id === (user?._id || user?.id);
                return (
                  <div key={swap._id} className="swap-card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                        Date: {formatDate(swap.date)}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
                        <strong>Sender:</strong> {swap.senderId?.name} 
                        <br />
                        <strong>Receiver:</strong> {swap.receiverId?.name} {isReceiver ? '(You)' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Offer: </span>
                          <span className="slot-card__badge slot-card__badge--override">Slot {swap.originalSlotId?.slotNumber}</span>
                          <span style={{ marginLeft: '4px' }}>{swap.originalSlotId?.subject}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Wanted: </span>
                          <span className="slot-card__badge slot-card__badge--override">Slot {swap.targetSlotId?.slotNumber}</span>
                          <span style={{ marginLeft: '4px' }}>{swap.targetSlotId?.subject}</span>
                        </div>
                      </div>
                    </div>

                    {isReceiver && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button 
                          className="btn btn--primary" 
                          onClick={() => handleRespond(swap._id, 'Approved')}
                          disabled={actionLoadingId === swap._id}
                        >
                          {actionLoadingId === swap._id ? '...' : 'Approve'}
                        </button>
                        <button 
                          className="btn btn--outline" 
                          onClick={() => handleRespond(swap._id, 'Rejected')}
                          disabled={actionLoadingId === swap._id}
                          style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {!isReceiver && (
                      <div style={{ padding: 'var(--space-2)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Awaiting Response
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="swaps-history">
          {historySwaps.length === 0 ? (
            <div className="tt-empty-prompt">No swap history found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: 'var(--space-3)' }}>Date</th>
                    <th style={{ padding: 'var(--space-3)' }}>Sender</th>
                    <th style={{ padding: 'var(--space-3)' }}>Receiver</th>
                    <th style={{ padding: 'var(--space-3)' }}>Offer Slot</th>
                    <th style={{ padding: 'var(--space-3)' }}>Target Slot</th>
                    <th style={{ padding: 'var(--space-3)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historySwaps.map(swap => (
                    <tr key={swap._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>{formatDate(swap.date)}</td>
                      <td style={{ padding: 'var(--space-3)' }}>{swap.senderId?.name}</td>
                      <td style={{ padding: 'var(--space-3)' }}>{swap.receiverId?.name}</td>
                      <td style={{ padding: 'var(--space-3)' }}>Slot {swap.originalSlotId?.slotNumber}</td>
                      <td style={{ padding: 'var(--space-3)' }}>Slot {swap.targetSlotId?.slotNumber}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span className={`slot-card__badge slot-card__badge--override`} style={{ background: swap.status === 'Approved' ? 'var(--success-color)' : 'var(--error-color)' }}>
                          {swap.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwapRequestsTab;
