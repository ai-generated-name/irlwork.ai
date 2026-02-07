// Proof Section Component
// Inline proof submission form (extracted from ProofSubmitModal logic)

import React, { useState, useRef } from 'react';

const styles = {
  input: 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
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
    <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
      <h2 className="text-xl font-bold text-white mb-4">Submit Proof of Work</h2>

      <div className="space-y-4">
        {/* Proof Text */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">Describe your work</label>
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
          <label className="block text-gray-400 text-sm mb-2">Upload Proof (max 3 images)</label>
          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
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
            <p className="text-gray-400 text-sm">Click to upload images</p>
            <p className="text-gray-500 text-xs mt-1">PNG, JPG, or JPEG (max 3 files)</p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {files.map((file, i) => (
                <div key={i} className="bg-white/10 rounded-lg p-2 pr-3 flex items-center gap-2">
                  <span className="text-sm text-white">
                    {file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-gray-400 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Confirmation */}
          {uploadedUrls.length > 0 && (
            <p className="text-green-400 text-sm flex items-center gap-2 mt-3">
              <span>✓</span> {uploadedUrls.length} files uploaded
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Proof'}
        </button>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
          <p className="font-medium mb-1">📝 Proof Submission Tips:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
            <li>Provide detailed description of work completed</li>
            <li>Upload clear photos showing the finished task</li>
            <li>Agent has 48 hours to review before auto-release</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
