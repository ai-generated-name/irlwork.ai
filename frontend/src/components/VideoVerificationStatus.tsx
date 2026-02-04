'use client';

import { useState, useEffect } from 'react';
import { bookingsAPI } from '../lib/api';

interface VideoVerificationStatusProps {
  bookingId: string;
  userRole: 'worker' | 'client';
  onStatusChange?: (status: VideoStatus) => void;
}

interface VideoStatus {
  hasVideo: boolean;
  isVerified: boolean;
  uploadedAt?: Date;
  videoUrl?: string;
  duration?: number;
}

export default function VideoVerificationStatus({
  bookingId,
  userRole,
  onStatusChange
}: VideoVerificationStatusProps) {
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await bookingsAPI.getVideoStatus(bookingId);
      setStatus(response.data.booking);
      onStatusChange?.(response.data.booking);
    } catch (err) {
      setError('Failed to load video status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [bookingId]);

  const handleConfirm = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await bookingsAPI.confirmVideoVerify(bookingId);
      await fetchStatus();
    } catch (err) {
      setError('Failed to verify video');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejecting this video:');
    if (reason === null) return; // User cancelled

    setActionLoading(true);
    setError(null);
    try {
      await bookingsAPI.rejectVideoVerify(bookingId, reason);
      await fetchStatus();
    } catch (err) {
      setError('Failed to reject video');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="video-status loading">
        <style jsx>{`
          .loading {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            color: #fff;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="spinner" />
        <p>Loading video status...</p>
      </div>
    );
  }

  if (!status?.hasVideo) {
    return (
      <div className="video-status empty">
        <style jsx>{`
          .empty {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
        `}</style>
        <div className="icon">🎥</div>
        <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
          No Video Verification Yet
        </p>
        {userRole === 'worker' && (
          <p>Upload a video of your completed work to verify the job.</p>
        )}
        {userRole === 'client' && (
          <p>Waiting for the worker to upload work verification.</p>
        )}
      </div>
    );
  }

  return (
    <div className="video-status">
      <style jsx>{`
        .video-status {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px;
          padding: 24px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-badge.pending {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        }
        .status-badge.verified {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }
        .video-preview {
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
          background: #000;
        }
        .video-preview video {
          width: 100%;
          max-height: 300px;
        }
        .meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }
        .meta-item strong {
          color: #fff;
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 2px;
        }
        .actions {
          display: flex;
          gap: 12px;
        }
        .button {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .button.confirm {
          background: linear-gradient(135deg, #00d4ff 0%, #0097e0 100%);
          color: #fff;
        }
        .button.confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
        }
        .button.reject {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
        }
        .button.reject:hover:not(:disabled) {
          background: rgba(255, 107, 107, 0.2);
        }
        .error {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-top: 16px;
          color: #ff6b6b;
          font-size: 14px;
        }
      `}</style>

      <div className="header">
        <h3 style={{ margin: 0, fontSize: '18px' }}>Video Verification</h3>
        <span className={`status-badge ${status.isVerified ? 'verified' : 'pending'}`}>
          {status.isVerified ? '✓ Verified' : 'Pending Review'}
        </span>
      </div>

      {status.videoUrl && (
        <div className="video-preview">
          <video src={status.videoUrl} controls />
        </div>
      )}

      <div className="meta">
        <div className="meta-item">
          <strong>Uploaded</strong>
          {status.uploadedAt ? formatDate(status.uploadedAt) : '-'}
        </div>
        <div className="meta-item">
          <strong>Duration</strong>
          {formatDuration(status.duration) || '-'}
        </div>
        {status.isVerified && status.uploadedAt && (
          <div className="meta-item">
            <strong>Verified</strong>
            {formatDate(status.uploadedAt)}
          </div>
        )}
      </div>

      {!status.isVerified && userRole === 'client' && (
        <div className="actions">
          <button
            className="button confirm"
            onClick={handleConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : '✓ Confirm Verification'}
          </button>
          <button
            className="button reject"
            onClick={handleReject}
            disabled={actionLoading}
          >
            ✕ Reject & Request New
          </button>
        </div>
      )}

      {!status.isVerified && userRole === 'worker' && (
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
          Waiting for client to verify your work video...
        </p>
      )}

      {status.isVerified && (
        <div style={{
          background: 'rgba(0, 255, 136, 0.1)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
          color: '#00ff88'
        }}>
          ✓ This work has been verified by the client
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
