'use client';

import { useState } from 'react';
import VideoUploader from './VideoUploader';
import VideoVerificationStatus from './VideoVerificationStatus';
import { bookingsAPI } from '../lib/api';

interface BookingCompletionFlowProps {
  bookingId: string;
  jobId: string;
  userRole: 'worker' | 'client';
  onComplete?: () => void;
}

export default function BookingCompletionFlow({
  bookingId,
  jobId,
  userRole,
  onComplete
}: BookingCompletionFlowProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVideoUploadComplete = async (videoUrl: string, thumbnailUrl?: string, duration?: number) => {
    setVideoUploaded(true);
    setCurrentStep('review');
  };

  const handleCompleteBooking = async () => {
    try {
      await bookingsAPI.updateStatus(bookingId, 'completed');
      setCurrentStep('complete');
      onComplete?.();
    } catch (err) {
      setError('Failed to complete booking');
    }
  };

  const handleVideoVerified = () => {
    // Refresh or trigger next action
    console.log('Video verified, ready to complete booking');
  };

  return (
    <div className="completion-flow">
      <style jsx>{`
        .completion-flow {
          max-width: 600px;
          margin: 0 auto;
        }
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          gap: 8px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.4);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .step.active {
          background: linear-gradient(135deg, #00d4ff 0%, #0097e0 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
        }
        .step.completed {
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
        }
        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .step.active .step-number {
          background: rgba(255, 255, 255, 0.2);
        }
        .step.completed .step-number {
          background: rgba(0, 255, 136, 0.3);
        }
        .step-divider {
          width: 40px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
        }
        .step-divider.active {
          background: linear-gradient(90deg, #00d4ff, #00ff88);
        }
        .step-content {
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .complete-message {
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          color: #fff;
        }
        .complete-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        .complete-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #00ff88, #00d4ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .complete-subtitle {
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #00d4ff 0%, #0097e0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .complete-button {
          background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
          border: none;
          border-radius: 12px;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: bold;
          color: #1a1a2e;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 24px;
        }
        .complete-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 255, 136, 0.4);
        }
        .error {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-top: 16px;
          color: #ff6b6b;
        }
      `}</style>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step ${currentStep === 'upload' ? 'active' : currentStep === 'review' || currentStep === 'complete' ? 'completed' : ''}`}>
          <span className="step-number">{currentStep === 'upload' ? '1' : '✓'}</span>
          <span>Upload Video</span>
        </div>
        <div className={`step-divider ${currentStep === 'review' || currentStep === 'complete' ? 'active' : ''}`} />
        <div className={`step ${currentStep === 'review' ? 'active' : currentStep === 'complete' ? 'completed' : ''}`}>
          <span className="step-number">{currentStep === 'review' ? '2' : currentStep === 'upload' ? '2' : '✓'}</span>
          <span>Review</span>
        </div>
        <div className={`step-divider ${currentStep === 'complete' ? 'active' : ''}`} />
        <div className={`step ${currentStep === 'complete' ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span>Complete</span>
        </div>
      </div>

      <div className="step-content">
        {/* Step 1: Upload Video */}
        {currentStep === 'upload' && (
          <div>
            <div className="section-title">
              <div className="section-icon">📹</div>
              Work Verification
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
              {userRole === 'worker'
                ? 'Record or upload a video showing the completed work to verify your submission.'
                : 'The worker will upload a video showing the completed work.'}
            </p>

            {userRole === 'worker' ? (
              <VideoUploader
                bookingId={bookingId}
                onUploadComplete={handleVideoUploadComplete}
                onError={setError}
                maxDuration={300}
              />
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>
                  Waiting for Worker
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  The worker needs to upload a video of the completed work before you can review it.
                </p>
              </div>
            )}

            {error && <div className="error">{error}</div>}
          </div>
        )}

        {/* Step 2: Review Video */}
        {currentStep === 'review' && (
          <div>
            <div className="section-title">
              <div className="section-icon">👀</div>
              {userRole === 'worker' ? 'Review Status' : 'Review Work'}
            </div>

            <VideoVerificationStatus
              bookingId={bookingId}
              userRole={userRole}
              onStatusChange={handleVideoVerified}
            />

            {userRole === 'client' && (
              <>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginTop: '24px',
                  textAlign: 'center'
                }}>
                  Once you verify the video, you can mark the booking as complete.
                </p>
                <button
                  className="complete-button"
                  onClick={handleCompleteBooking}
                  style={{ width: '100%' }}
                >
                  Mark Booking Complete
                </button>
              </>
            )}

            {userRole === 'worker' && (
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '24px',
                textAlign: 'center'
              }}>
                Waiting for the client to verify your work video...
              </p>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <div className="complete-message">
            <div className="complete-icon">🎉</div>
            <div className="complete-title">Booking Complete!</div>
            <div className="complete-subtitle">
              The work has been verified and the booking is now complete.
            </div>
            <button className="complete-button" onClick={onComplete}>
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
