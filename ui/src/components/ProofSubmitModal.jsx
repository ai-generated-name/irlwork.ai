import React, { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import API_URL from '../config/api'

function ProofSubmitModal({ task, onClose, onSubmit }) {
  const toast = useToast()
  const [proofText, setProofText] = useState('')
  const [files, setFiles] = useState([])
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length + files.length > 3) {
      toast.error('Maximum 3 files allowed')
      return
    }
    const newFiles = [...files, ...selected].slice(0, 3)
    setFiles(newFiles)

    // Upload each new file to the backend
    setUploading(true)
    try {
      for (const file of selected) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const res = await fetch(`${API_URL}/upload/proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: task?.human_id || ''
          },
          body: JSON.stringify({ file: base64, filename: file.name, mimeType: file.type })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.url) {
            setUploadedUrls(prev => [...prev, data.url])
          }
        } else {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setUploadedUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0 && files.length === 0) {
      toast.error('Please provide proof text or upload images')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Submit Proof</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-tertiary)', padding: 4 }}>&#10005;</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Describe your work</label>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe what you did to complete this task..."
              rows={4}
              className="onboarding-v4-input"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Upload Proof (max 3 files)</label>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                cursor: files.length >= 3 ? 'default' : 'pointer',
                opacity: files.length >= 3 ? 0.5 : 1,
                transition: 'border-color 0.2s'
              }}
              onClick={() => files.length < 3 && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}><Upload size={28} /></div>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                {files.length >= 3 ? 'Maximum files reached' : 'Click to upload images'}
              </p>
            </div>
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {files.map((file, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>{file.name.length > 18 ? file.name.slice(0, 18) + '...' : file.name}</span>
                    <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, padding: 0 }}>&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploading && (
            <p style={{ fontSize: 13, color: '#FEBC2E', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="loading-v4-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading files...
            </p>
          )}
          {uploadedUrls.length > 0 && !uploading && (
            <p style={{ fontSize: 13, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 8 }}>
              &#10003; {uploadedUrls.length} file{uploadedUrls.length !== 1 ? 's' : ''} uploaded
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="v4-btn v4-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="v4-btn v4-btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? 'Submitting...' : 'Submit Proof'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProofSubmitModal
