// Proof Section Component
// Inline proof submission form (extracted from ProofSubmitModal logic)

import React, { useState, useRef } from 'react';

const styles = {
  input: 'w-full bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] transition-colors'
};

export default function ProofSection({ task, onSubmit }) {
  const [proofText, setProofText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Only show if task status is 'in_progress'
  if (!task || task.status !== 'in_progress') return null;

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 3) {
      alert('Maximum 3 files allowed');
      return;
    }
    setFiles(prev => [...prev, ...selected].slice(0, 3));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      alert('Please provide proof text or upload images');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls });
      // Clear form on success
      setProofText('');
      setFiles([]);
      setUploadedUrls([]);
    } catch (error) {
      console.error('Error submitting proof:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 mb-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Submit Proof of Work</h2>

      <div className="space-y-4">
        {/* Proof Text */}
        <div>
          <label className="block text-[#525252] text-sm mb-2">Describe your work</label>
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            placeholder="Describe what you did to complete this task..."
            rows={4}
            className={`${styles.input} resize-none`}
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-[#525252] text-sm mb-2">Upload Proof (max 3 images)</label>
          <div
            className="border-2 border-dashed border-[rgba(26,26,26,0.2)] rounded-xl p-6 text-center cursor-pointer hover:border-[#0F4C5C] transition-colors bg-[#FAF8F5]"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-3xl mb-2">📤</div>
            <p className="text-[#525252] text-sm">Click to upload images</p>
            <p className="text-[#8A8A8A] text-xs mt-1">PNG, JPG, or JPEG (max 3 files)</p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {files.map((file, i) => (
                <div key={i} className="bg-[#F5F2ED] rounded-lg p-2 pr-3 flex items-center gap-2">
                  <span className="text-sm text-[#1A1A1A]">
                    {file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-[#8A8A8A] hover:text-[#DC2626] text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Confirmation */}
          {uploadedUrls.length > 0 && (
            <p className="text-[#059669] text-sm flex items-center gap-2 mt-3">
              <span>✓</span> {uploadedUrls.length} files uploaded
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#E07A5F] hover:bg-[#C45F4A] disabled:bg-[#F5F2ED] disabled:text-[#8A8A8A] disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Proof'}
        </button>

        {/* Instructions */}
        <div className="bg-[#D1E9F0] border border-[rgba(15,76,92,0.2)] rounded-lg p-3 text-sm text-[#0F4C5C]">
          <p className="font-medium mb-1">📝 Proof Submission Tips:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-[#525252]">
            <li>Provide detailed description of work completed</li>
            <li>Upload clear photos showing the finished task</li>
            <li>Agent has 48 hours to review before auto-release</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
