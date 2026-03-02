import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui'

function ProofReviewModal({ task, onClose, onApprove, onReject }) {
  const [feedback, setFeedback] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [hours, setHours] = useState(24)

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Review Proof</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{task?.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{task?.description}</p>
          </div>
          {task?.proof_description && (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16 }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Human's Proof:</h4>
              <p style={{ color: 'var(--text-primary)' }}>{task.proof_description}</p>
            </div>
          )}
          {task?.proof_urls?.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Proof Images:</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {task.proof_urls.filter(url => {
                  try { const u = new URL(url); return ['https:', 'data:'].includes(u.protocol); } catch { return false; }
                }).map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i + 1}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Feedback (required for reject)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback..."
              rows={3}
              className="onboarding-v4-input"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          {rejecting && (
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Extend deadline by (hours)</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                min={1}
                max={168}
                className="onboarding-v4-input"
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="secondary" size="md" className="flex-1" onClick={() => setRejecting(!rejecting)}>
            {rejecting ? 'Cancel reject' : 'Reject'}
          </Button>
          <Button variant="primary" size="md" className="flex-1 !bg-[#16A34A] hover:!bg-[#15803D]" onClick={onApprove}>
            Approve & pay
          </Button>
        </div>
        {rejecting && (
          <Button
            variant="destructive"
            size="md"
            className="w-full mt-3"
            onClick={() => onReject({ feedback, extendHours: hours })}
            disabled={!feedback.trim()}
          >
            Confirm rejection
          </Button>
        )}
      </div>
    </div>
  )
}

export default ProofReviewModal
