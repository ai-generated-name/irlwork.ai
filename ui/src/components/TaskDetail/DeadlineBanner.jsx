// DeadlineBanner Component
// Live countdown with urgency colors, extension request/response UI

import React, { useState, useEffect } from 'react';
import API_URL from '../../config/api';

function formatCountdown(diffMs) {
  if (diffMs <= 0) {
    const abs = Math.abs(diffMs);
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    return `OVERDUE by ${hours}h ${minutes}m`;
  }
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function getUrgencyStyle(diffMs) {
  if (diffMs <= 0) return { bg: 'rgba(255, 95, 87, 0.15)', border: '#FF5F57', text: '#FF5F57', pulse: true };
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return { bg: 'rgba(255, 95, 87, 0.15)', border: '#FF5F57', text: '#FF5F57', pulse: true };
  if (hours < 6) return { bg: 'rgba(255, 95, 87, 0.10)', border: '#FF5F57', text: '#FF5F57', pulse: false };
  if (hours < 24) return { bg: 'rgba(254, 188, 46, 0.15)', border: '#FEBC2E', text: '#B8860B', pulse: false };
  return { bg: 'rgba(34, 197, 94, 0.10)', border: '#22C55E', text: '#166534', pulse: false };
}

export default function DeadlineBanner({ task, user }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [extendMode, setExtendMode] = useState('datetime'); // 'datetime' | 'hours'
  const [extendDatetime, setExtendDatetime] = useState('');
  const [extendHours, setExtendHours] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [modifyDeadline, setModifyDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const isWorker = user && task && task.human_id === user.id;
  const isPoster = user && task && task.agent_id === user.id;
  const showBanner = task?.deadline && ['in_progress', 'assigned'].includes(task?.status);

  // Live countdown
  useEffect(() => {
    if (!showBanner) return;
    const tick = () => setTimeLeft(new Date(task.deadline) - new Date());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task?.deadline, showBanner]);

  // Fetch extension requests
  useEffect(() => {
    if (!showBanner || !user?.token) return;
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_URL}/tasks/${task.id}/extension-requests`, {
          headers: { Authorization: user.token }
        });
        if (res.ok) {
          const data = await res.json();
          setExtensionRequests(data.extension_requests || []);
        }
      } catch {}
    };
    fetchRequests();
  }, [task?.id, task?.deadline, showBanner, user?.token]);

  if (!showBanner || timeLeft === null) return null;

  const urgency = getUrgencyStyle(timeLeft);
  const countdownText = formatCountdown(timeLeft);
  const pendingRequest = extensionRequests.find(r => r.status === 'pending');
  const lastDeclined = extensionRequests.find(r => r.status === 'declined');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Worker: request extension
  const handleRequestExtension = async () => {
    if (!extensionReason.trim() || !proposedDeadline) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/request-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token },
        body: JSON.stringify({ reason: extensionReason, proposed_deadline: new Date(proposedDeadline).toISOString() })
      });
      const data = await res.json();
      if (res.ok) {
        setExtensionRequests(prev => [data.extension_request, ...prev]);
        setShowExtensionModal(false);
        setExtensionReason('');
        setProposedDeadline('');
        showToast('Extension request submitted');
      } else {
        showToast(data.error || 'Failed to request extension', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setSubmitting(false);
  };

  // Poster: extend deadline directly
  const handleExtendDeadline = async () => {
    setSubmitting(true);
    try {
      const body = extendMode === 'datetime'
        ? { new_deadline: new Date(extendDatetime).toISOString() }
        : { extend_hours: Number(extendHours) };
      const res = await fetch(`${API_URL}/tasks/${task.id}/extend-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setShowExtendModal(false);
        setExtendDatetime('');
        setExtendHours('');
        showToast('Deadline extended');
        // Reload page to get updated task
        window.location.reload();
      } else {
        showToast(data.error || 'Failed to extend deadline', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setSubmitting(false);
  };

  // Poster: respond to extension request
  const handleRespondExtension = async (requestId, action) => {
    setSubmitting(true);
    try {
      const body = { request_id: requestId, action, response_note: responseNote || undefined };
      if (action === 'modify' && modifyDeadline) {
        body.modified_deadline = new Date(modifyDeadline).toISOString();
      }
      const res = await fetch(`${API_URL}/tasks/${task.id}/respond-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setExtensionRequests(prev => prev.map(r => r.id === requestId ? data.extension_request : r));
        setResponseNote('');
        setModifyDeadline('');
        showToast(`Extension ${action === 'approve' ? 'approved' : action === 'decline' ? 'declined' : 'modified'}`);
        if (action !== 'decline') window.location.reload();
      } else {
        showToast(data.error || 'Failed to respond', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.type === 'error' ? '#FF5F57' : '#22C55E',
          color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Banner */}
      <div
        className={urgency.pulse ? 'animate-pulse' : ''}
        style={{
          background: urgency.bg,
          borderLeft: `4px solid ${urgency.border}`,
          borderRadius: 14,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={urgency.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: urgency.text }}>
                {countdownText}
              </div>
              <div style={{ fontSize: 13, color: '#888888', marginTop: 2 }}>
                Deadline: {new Date(task.deadline).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Worker: Request Extension */}
            {isWorker && !pendingRequest && (
              <button
                onClick={() => setShowExtensionModal(true)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: '2px solid #E5E5E5',
                  background: '#fff', color: '#333', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Request Extension
              </button>
            )}
            {/* Poster: Extend Deadline */}
            {isPoster && (
              <button
                onClick={() => setShowExtendModal(true)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: '2px solid #E5E5E5',
                  background: '#fff', color: '#333', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Extend Deadline
              </button>
            )}
          </div>
        </div>

        {/* Worker: pending request status */}
        {isWorker && pendingRequest && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(254,188,46,0.15)', borderRadius: 10, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>Extension requested</span> — awaiting response.
            Proposed: {new Date(pendingRequest.proposed_deadline).toLocaleString()}
          </div>
        )}

        {/* Worker: last declined request */}
        {isWorker && !pendingRequest && lastDeclined && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,95,87,0.1)', borderRadius: 10, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: '#FF5F57' }}>Extension declined</span>
            {lastDeclined.response_note && <span> — {lastDeclined.response_note}</span>}
            <span style={{ marginLeft: 8, color: '#888' }}>You can request again.</span>
          </div>
        )}

        {/* Poster: pending extension request to review */}
        {isPoster && pendingRequest && (
          <div style={{ marginTop: 12, padding: '14px', background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Extension Request from {pendingRequest.requester?.name || 'Worker'}
            </div>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>
              <strong>Reason:</strong> {pendingRequest.reason}
            </div>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 12 }}>
              <strong>Proposed deadline:</strong> {new Date(pendingRequest.proposed_deadline).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <button
                onClick={() => handleRespondExtension(pendingRequest.id, 'approve')}
                disabled={submitting}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  background: '#22C55E', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', opacity: submitting ? 0.6 : 1
                }}
              >
                Approve
              </button>
              <button
                onClick={() => handleRespondExtension(pendingRequest.id, 'decline')}
                disabled={submitting}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: '2px solid #FF5F57',
                  background: '#fff', color: '#FF5F57', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', opacity: submitting ? 0.6 : 1
                }}
              >
                Decline
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="datetime-local"
                  value={modifyDeadline}
                  onChange={e => setModifyDeadline(e.target.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 10, border: '2px solid #E5E5E5',
                    fontSize: 13
                  }}
                />
                <button
                  onClick={() => modifyDeadline && handleRespondExtension(pendingRequest.id, 'modify')}
                  disabled={submitting || !modifyDeadline}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: '2px solid #E5E5E5',
                    background: '#fff', color: '#333', fontWeight: 600, fontSize: 13,
                    cursor: modifyDeadline ? 'pointer' : 'not-allowed', opacity: (submitting || !modifyDeadline) ? 0.5 : 1
                  }}
                >
                  Modify
                </button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Response note (optional)"
                value={responseNote}
                onChange={e => setResponseNote(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  border: '2px solid #E5E5E5', fontSize: 13
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Worker: Request Extension Modal */}
      {showExtensionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowExtensionModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, padding: 24, width: '90%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1A1A1A' }}>Request deadline extension</h3>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>
              Reason <span style={{ color: '#FF5F57' }}>*</span>
            </label>
            <textarea
              value={extensionReason}
              onChange={e => setExtensionReason(e.target.value)}
              placeholder="Why do you need more time?"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E5E5',
                fontSize: 14, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box'
              }}
            />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>
              Proposed new deadline <span style={{ color: '#FF5F57' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={proposedDeadline}
              onChange={e => setProposedDeadline(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E5E5',
                fontSize: 14, marginBottom: 16, boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExtensionModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '2px solid #E5E5E5',
                  background: '#fff', color: '#333', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestExtension}
                disabled={submitting || !extensionReason.trim() || !proposedDeadline}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#333', color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: (submitting || !extensionReason.trim() || !proposedDeadline) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || !extensionReason.trim() || !proposedDeadline) ? 0.5 : 1
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poster: Extend Deadline Modal */}
      {showExtendModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowExtendModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, padding: 24, width: '90%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1A1A1A' }}>Extend Deadline</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setExtendMode('datetime')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '2px solid',
                  borderColor: extendMode === 'datetime' ? '#333' : '#E5E5E5',
                  background: extendMode === 'datetime' ? '#333' : '#fff',
                  color: extendMode === 'datetime' ? '#fff' : '#333',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Set Date
              </button>
              <button
                onClick={() => setExtendMode('hours')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '2px solid',
                  borderColor: extendMode === 'hours' ? '#333' : '#E5E5E5',
                  background: extendMode === 'hours' ? '#333' : '#fff',
                  color: extendMode === 'hours' ? '#fff' : '#333',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Extend by Hours
              </button>
            </div>
            {extendMode === 'datetime' ? (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>New Deadline</label>
                <input
                  type="datetime-local"
                  value={extendDatetime}
                  onChange={e => setExtendDatetime(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E5E5',
                    fontSize: 14, marginBottom: 16, boxSizing: 'border-box'
                  }}
                />
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>Extend by (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={extendHours}
                  onChange={e => setExtendHours(e.target.value)}
                  placeholder="e.g. 24"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E5E5',
                    fontSize: 14, marginBottom: 16, boxSizing: 'border-box'
                  }}
                />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExtendModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '2px solid #E5E5E5',
                  background: '#fff', color: '#333', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExtendDeadline}
                disabled={submitting || (extendMode === 'datetime' ? !extendDatetime : !extendHours)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#333', color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: (submitting || (extendMode === 'datetime' ? !extendDatetime : !extendHours)) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || (extendMode === 'datetime' ? !extendDatetime : !extendHours)) ? 0.5 : 1
                }}
              >
                {submitting ? 'Extending...' : 'Extend Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
