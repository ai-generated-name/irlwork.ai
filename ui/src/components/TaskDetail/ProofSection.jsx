// Proof Section Component
// Inline proof submission form (extracted from ProofSubmitModal logic)

import React, { useState, useRef } from 'react';
import { Upload, Hourglass, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
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
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

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
        throw new Error(errData.error || 'Upload failed');
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

    // Validate file sizes (20MB max per file, compress before upload)
    const oversized = selected.find(f => f.size > 20 * 1024 * 1024);
    if (oversized) {
      toast.error('Each file must be under 20MB');
      return;
    }

    const newFiles = [...files, ...selected].slice(0, 3);
    setFiles(newFiles);

    // Upload immediately
    setUploading(true);
    setUploadProgress(`Uploading 1/${selected.length}...`);
    try {
      const urls = [...uploadedUrls];
      for (let idx = 0; idx < selected.length; idx++) {
        setUploadProgress(`Uploading ${idx + 1}/${selected.length}...`);
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
        const url = await uploadFile(fileToUpload);
        urls.push(url);
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
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      toast.error('Please provide proof text or upload images');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls });
      // Clear form on success
      setProofText('');
      setFiles([]);
      setUploadedUrls([]);
      toast.success('Proof submitted successfully!');
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] p-4 sm:p-6 shadow-sm">
      <h2 className="text-base sm:text-xl font-bold text-[#1A1A1A] mb-3 sm:mb-4">Submit Proof of Work</h2>

      <div className="space-y-3 sm:space-y-4">
        {/* Proof Text */}
        <div>
          <label className="block text-[#333333] text-xs sm:text-sm mb-1.5 sm:mb-2">Describe your work</label>
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            placeholder="Describe what you did to complete this task..."
            rows={3}
            className={`${styles.input} resize-none text-sm`}
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-[#333333] text-xs sm:text-sm mb-1.5 sm:mb-2">Upload Proof (max 3 images)</label>
          <div
            className="border-2 border-dashed border-[rgba(0,0,0,0.2)] rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-[#E8853D] transition-colors bg-[#FAFAF8]"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{uploading ? <Hourglass size={24} /> : <Upload size={24} />}</div>
            <p className="text-[#333333] text-xs sm:text-sm">
              {uploading ? (uploadProgress || 'Uploading...') : 'Tap to upload images'}
            </p>
            <p className="text-[#888888] text-xs mt-0.5 sm:mt-1">PNG, JPG, or JPEG (max 3)</p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
              {files.map((file, i) => (
                <div key={i} className="bg-[#F5F3F0] rounded-lg p-1.5 sm:p-2 pr-2 sm:pr-3 flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm text-[#1A1A1A]">
                    {file.name.length > 15 ? file.name.slice(0, 15) + '...' : file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-[#888888] hover:text-[#FF5F57] text-xs sm:text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Confirmation */}
          {uploadedUrls.length > 0 && (
            <p className="text-[#16A34A] text-xs sm:text-sm flex items-center gap-2 mt-2 sm:mt-3">
              <span>✓</span> {uploadedUrls.length} file(s) uploaded
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full bg-[#E8853D] hover:bg-[#D4703A] disabled:bg-[#F5F3F0] disabled:text-[#888888] disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors text-sm sm:text-base"
        >
          {submitting ? 'Submitting...' : uploading ? (uploadProgress || 'Uploading files...') : 'Submit Proof'}
        </button>

        {/* Instructions */}
        <div className="bg-[rgba(232,133,61,0.08)] border border-[rgba(232,133,61,0.15)] rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-[#E8853D]">
          <p className="font-medium mb-1"><FileText size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Tips:</p>
          <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs text-[#333333]">
            <li>Describe work completed in detail</li>
            <li>Upload clear photos of finished task</li>
            <li>48h review window before auto-release</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
