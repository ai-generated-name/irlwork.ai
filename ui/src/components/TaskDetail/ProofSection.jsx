// Proof Section Component
// Inline proof submission form (extracted from ProofSubmitModal logic)

import React, { useState, useRef } from 'react';
import { getErrorMessage } from '../../utils/apiErrors';
import { Upload, Hourglass, FileText, X, Check } from 'lucide-react';
import { Card, Button } from '../ui';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import API_URL from '../../config/api';

const styles = {
  input: 'w-full bg-white border-2 border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#888888] focus:outline-none focus:border-[#E8853D] transition-colors'
};

export default function ProofSection({ task, user, onSubmit }) {
  const toast = useToast();
  const [proofText, setProofText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(''); // e.g. "Uploading 1/3..."
  const [fileStates, setFileStates] = useState([]); // [{name, size, status: 'pending'|'uploading'|'complete'|'failed'}]
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const fileInputRef = useRef(null);

  const PROOF_TEXT_MAX = 2000;

  // Only show if task status is 'in_progress'
  if (!task || task.status !== 'in_progress') return null;

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload a single file to the backend
  const uploadFile = async (file) => {
    const base64 = await fileToBase64(file);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${API_URL}/upload/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.token || '',
        },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage(errData, 'Upload failed'));
      }
      const data = await res.json();
      return data.url;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Upload timed out — try a stronger connection');
      throw err;
    }
  };

  const handleFileSelect = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    // Clone file data BEFORE resetting input — iOS Safari invalidates
    // File blobs when input.value is cleared
    const selected = await Promise.all(
      rawFiles.map(async (f) => {
        const buf = await f.arrayBuffer();
        return new File([buf], f.name, { type: f.type, lastModified: f.lastModified });
      })
    );
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (selected.length + files.length > 3) {
      toast.error('Maximum 3 files allowed');
      return;
    }

    // Validate file sizes — backend checks decoded base64 against 10MB.
    // Images get compressed before upload (maxSizeMB: 2), so 10MB raw is fine.
    // Videos are NOT compressed, and base64 encoding adds ~33% overhead,
    // so cap videos at 7MB raw to stay under 10MB after encoding.
    for (const f of selected) {
      const isVideo = f.type?.startsWith('video/');
      const limit = isVideo ? 7 * 1024 * 1024 : 10 * 1024 * 1024;
      if (f.size > limit) {
        toast.error(isVideo ? 'Videos must be under 7MB' : 'Images must be under 10MB');
        return;
      }
    }

    const newFiles = [...files, ...selected].slice(0, 3);
    setFiles(newFiles);

    // Initialize per-file states for new files
    const newStates = selected.map(f => ({
      name: f.name,
      size: f.size,
      status: 'pending',
    }));
    setFileStates(prev => [...prev, ...newStates].slice(0, 3));

    // Upload immediately
    setUploading(true);
    setUploadProgress(`Uploading 1 of ${selected.length} files...`);
    try {
      const urls = [...uploadedUrls];
      const stateOffset = fileStates.length;
      for (let idx = 0; idx < selected.length; idx++) {
        const fileIdx = stateOffset + idx;
        setCurrentUploadIndex(fileIdx);
        setUploadProgress(`Uploading ${idx + 1} of ${selected.length} files...`);
        setFileStates(prev => prev.map((s, i) => i === fileIdx ? { ...s, status: 'uploading' } : s));

        const file = selected[idx];
        let fileToUpload = file;
        const ext = file.name?.split('.').pop()?.toLowerCase();
        const isGif = file.type === 'image/gif' || ext === 'gif';
        const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
        if (!isGif && isImage) {
          try {
            const imageCompression = (await import('browser-image-compression')).default;
            fileToUpload = await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 2000,
              useWebWorker: typeof Worker !== 'undefined',
            });
          } catch (compErr) {
            console.warn('Compression failed, uploading original:', compErr);
          }
        }
        try {
          const url = await uploadFile(fileToUpload);
          urls.push(url);
          setFileStates(prev => prev.map((s, i) => i === fileIdx ? { ...s, status: 'complete' } : s));
        } catch (fileErr) {
          setFileStates(prev => prev.map((s, i) => i === fileIdx ? { ...s, status: 'failed' } : s));
          throw fileErr;
        }
      }
      setUploadedUrls(urls.slice(0, 3));
      toast.success(`${selected.length} file(s) uploaded`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload file(s)');
      setFiles(prev => prev.filter((_, i) => i < uploadedUrls.length));
    } finally {
      setUploading(false);
      setUploadProgress('');
      setCurrentUploadIndex(-1);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
    setFileStates(prev => prev.filter((_, i) => i !== index));
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles?.length) {
      // Simulate file input change event
      handleFileSelect({ target: { files: droppedFiles } });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmitClick = () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      toast.error('Please provide proof text or upload images');
      return;
    }
    setConfirmError(null);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    setConfirmError(null);
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls });
      setShowConfirm(false);
      setProofText('');
      setFiles([]);
      setUploadedUrls([]);
      toast.success('Proof submitted successfully!');
    } catch (error) {
      console.error('Error submitting proof:', error);
      setConfirmError(error.message || 'Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-base sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4">Submit Proof of Work</h2>

      <div className="space-y-3 sm:space-y-4">
        {/* Proof Text */}
        <div>
          <label className="block text-[#333333] text-xs sm:text-sm mb-1.5 sm:mb-2">Describe your work</label>
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value.slice(0, PROOF_TEXT_MAX))}
            placeholder="Describe what you did to complete this task..."
            rows={3}
            maxLength={PROOF_TEXT_MAX}
            className={`${styles.input} resize-none text-sm`}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${proofText.length > PROOF_TEXT_MAX * 0.9 ? 'text-[#FEBC2E]' : 'text-[#888888]'}`}>
              {proofText.length} / {PROOF_TEXT_MAX}
            </span>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-[#333333] text-xs sm:text-sm mb-1.5 sm:mb-2">
            Upload Proof (max 3 files, optional if you provide text)
          </label>

          {/* Overall progress */}
          {uploading && (
            <div className="mb-2 px-1">
              <p className="text-[#333333] text-xs sm:text-sm font-medium">{uploadProgress}</p>
            </div>
          )}

          {/* Per-file progress list */}
          {fileStates.length > 0 && (
            <div className="space-y-2 mb-3">
              {fileStates.map((fs, i) => (
                <div key={i} className="bg-[#F5F3F0] rounded-[10px] p-2.5 sm:p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {fs.status === 'complete' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="flex-shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {fs.status === 'failed' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5F57" strokeWidth="2.5" className="flex-shrink-0">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      {fs.status === 'uploading' && (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-[#F5F3F0] border-t-[#E8853D] rounded-full animate-spin flex-shrink-0" />
                      )}
                      {fs.status === 'pending' && (
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-[rgba(0,0,0,0.1)] flex-shrink-0" />
                      )}
                      <span className="text-xs text-[#1A1A1A] truncate">
                        {fs.name.length > 30 ? fs.name.slice(0, 27) + '...' : fs.name}
                      </span>
                      <span className="text-xs text-[#888888] flex-shrink-0">{formatFileSize(fs.size)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fs.status === 'failed' && (
                        <span className="text-xs text-[#FF5F57]">Failed</span>
                      )}
                      {fs.status !== 'uploading' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="text-[#888888] hover:text-[#FF5F57] text-xs p-0.5"
                          aria-label={`Remove ${fs.name}`}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {fs.status === 'uploading' && (
                    <div className="w-full h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8853D] rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                  {fs.status === 'complete' && (
                    <div className="w-full h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#16A34A] rounded-full" style={{ width: '100%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          {files.length < 3 && (
            <div
              className={`border-2 border-dashed rounded-[14px] p-4 sm:p-6 text-center cursor-pointer transition-colors bg-[#FAFAF8] ${
                isDragging
                  ? 'border-[#E8853D] bg-[#FFF3EB]'
                  : 'border-[rgba(0,0,0,0.15)] hover:border-[#E8853D]'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/quicktime,.mov"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-[#888888] mb-1 sm:mb-2">
                {uploading ? <Hourglass size={24} className="mx-auto" /> : <Upload size={24} className="mx-auto" />}
              </div>
              <p className="text-[#333333] text-xs sm:text-sm">
                {isDragging ? 'Drop files here' : uploading ? 'Uploading...' : 'Tap or drag files here'}
              </p>
              <p className="text-[#888888] text-xs mt-0.5 sm:mt-1">
                PNG, JPG, MP4, MOV · {3 - files.length} slot{3 - files.length !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleSubmitClick}
          disabled={submitting || uploading}
        >
          {submitting ? 'Submitting...' : uploading ? (uploadProgress || 'Uploading files...') : 'Submit Proof'}
        </Button>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirm}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirm(false)}
          title="Submit proof of completion?"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                {uploadedUrls.length > 0 && proofText.trim()
                  ? `${uploadedUrls.length} file${uploadedUrls.length > 1 ? 's' : ''} + text description`
                  : uploadedUrls.length > 0
                  ? `${uploadedUrls.length} file${uploadedUrls.length > 1 ? 's' : ''}`
                  : 'Text description only'}
              </p>
              <p style={{ color: '#888888', fontSize: 12 }}>
                The task creator will have 48 hours to review. This cannot be undone.
              </p>
            </div>
          }
          confirmLabel="Submit Proof"
          variant="warning"
          isLoading={submitting}
          error={confirmError}
        />

        {/* Instructions */}
        <div className="bg-[rgba(232,133,61,0.08)] border border-[rgba(232,133,61,0.15)] rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-[#E8853D]">
          <p className="font-medium mb-1"><FileText size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Tips:</p>
          <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs text-[#333333]">
            <li>Describe work completed in detail</li>
            <li>Upload clear photos or videos of finished task</li>
            <li>48h review window before auto-release</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
