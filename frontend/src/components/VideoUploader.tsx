'use client';

import { useState, useRef, useCallback } from 'react';
import { bookingsAPI } from '../lib/api';

interface VideoUploaderProps {
  bookingId: string;
  onUploadComplete: (videoUrl: string, thumbnailUrl?: string, duration?: number) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
}

export default function VideoUploader({
  bookingId,
  onUploadComplete,
  onError,
  maxDuration = 300 // 5 minutes default max
}: VideoUploaderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        await uploadVideo(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      const message = 'Failed to access camera. Please ensure camera permissions are granted.';
      setError(message);
      onError?.(message);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
  }, [maxDuration]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      const message = 'Please select a video file';
      setError(message);
      onError?.(message);
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const message = 'Video file too large. Maximum size is 100MB';
      setError(message);
      onError?.(message);
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    await uploadVideo(file);
  };

  const uploadVideo = async (blob: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // In production, upload to cloud storage (S3, Cloudinary, etc.)
      // For now, we'll create a local URL and simulate upload
      const formData = new FormData();
      formData.append('video', blob, 'verification-video.webm');

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Simulated upload - in production, use actual cloud storage
      const mockVideoUrl = `/api/videos/${bookingId}-${Date.now()}.webm`;

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Get video duration
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(blob);
      await new Promise(resolve => {
        videoElement.onloadedmetadata = resolve;
      });
      const duration = Math.round(videoElement.duration);

      // Call API to associate video with booking
      await bookingsAPI.uploadVideoVerify(bookingId, {
        videoUrl: mockVideoUrl,
        duration
      });

      onUploadComplete(mockVideoUrl, undefined, duration);
      setVideoPreview(null);

    } catch (err) {
      const message = 'Failed to upload video. Please try again.';
      setError(message);
      onError?.(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-uploader">
      <style jsx>{`
        .video-uploader {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .upload-area {
          border: 2px dashed ${dragActive ? '#00d4ff' : 'rgba(255, 255, 255, 0.2)'};
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-area:hover {
          border-color: #00d4ff;
          background: rgba(0, 212, 255, 0.05);
        }

        .record-button {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px auto;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .record-button:hover {
          transform: scale(1.1);
          box-shadow: 0 0 30px rgba(238, 90, 36, 0.5);
        }

        .record-button.recording {
          background: linear-gradient(135deg, #00d4ff 0%, #0097e0 100%);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4); }
          50% { box-shadow: 0 0 0 15px rgba(0, 212, 255, 0); }
        }

        .recording-time {
          font-size: 24px;
          font-weight: bold;
          color: #ff6b6b;
          margin-top: 16px;
        }

        .video-preview {
          margin-top: 20px;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
        }

        .video-preview video {
          width: 100%;
          max-height: 400px;
        }

        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          margin-top: 16px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00d4ff, #00ff88);
          transition: width 0.3s ease;
        }

        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-top: 16px;
          color: #ff6b6b;
        }

        .instructions {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="upload-area"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('video-input')?.click()}
      >
        <input
          type="file"
          id="video-input"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {!videoPreview && !isRecording && (
          <>
            <div className="upload-icon">📹</div>
            <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              Upload or Record Work Verification
            </p>
            <p className="instructions">
              Drag and drop a video, or click to browse
            </p>
            <p className="instructions" style={{ marginTop: '16px' }}>
              Maximum duration: {formatTime(maxDuration)}
            </p>

            <button
              type="button"
              className="record-button"
              onClick={(e) => {
                e.stopPropagation();
                startRecording();
              }}
            >
              <div style={{
                width: '30px',
                height: '30px',
                background: '#fff',
                borderRadius: '50%'
              }} />
            </button>
            <p className="instructions">Tap to start recording</p>
          </>
        )}

        {isRecording && (
          <>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: '300px', borderRadius: '12px' }} />
            <div className="recording-time">
              {formatTime(recordingTime)}
            </div>
            <button
              type="button"
              className="record-button recording"
              onClick={(e) => {
                e.stopPropagation();
                stopRecording();
              }}
            >
              <div style={{
                width: '30px',
                height: '30px',
                background: '#fff',
                borderRadius: '50%'
              }} />
            </button>
            <p className="instructions">Tap to stop recording</p>
          </>
        )}

        {videoPreview && (
          <div className="video-preview">
            <video src={videoPreview} controls />
          </div>
        )}

        {isUploading && (
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
