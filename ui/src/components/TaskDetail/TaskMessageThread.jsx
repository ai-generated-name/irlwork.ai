// Task Message Thread Component
// Always-visible messaging interface for task communication

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

const styles = {
  input: 'w-full bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] transition-colors'
};

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

export default function TaskMessageThread({
  conversation,
  messages,
  user,
  onSendMessage,
  onLoadMessages
}) {
  const toast = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3 seconds (optimized — parent passes incremental loader)
  useEffect(() => {
    if (!conversation) return;

    const interval = setInterval(() => {
      onLoadMessages?.();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversation, onLoadMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage, attachments.length > 0 ? attachments : undefined);
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Attachment upload handler
  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments per message');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum 10MB.`);
          continue;
        }

        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch(`${API_URL}/upload/message-attachment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: user.id },
          body: JSON.stringify({ file: base64, filename: file.name, mimeType: file.type })
        });

        if (res.ok) {
          const data = await res.json();
          setAttachments(prev => [...prev, { url: data.url, name: file.name, type: file.type, size: file.size }]);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    } catch (err) {
      toast.error('Failed to upload attachment');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Sort messages by created_at to guarantee order (#3)
  const sortedMessages = [...(messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] flex flex-col h-[320px] sm:h-[420px] lg:h-[500px] shadow-sm">
      {/* Header */}
      <div className="px-3 py-2.5 sm:p-4 border-b border-[rgba(26,26,26,0.08)]">
        <h3 className="text-[#1A1A1A] font-bold text-sm sm:text-base">Messages</h3>
        <p className="text-[#525252] text-xs sm:text-sm">Chat with the agent about this task</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#FAF8F5]">
        {!conversation ? (
          <div className="flex items-center justify-center h-full text-[#525252] text-xs sm:text-sm">
            No messages yet. Send a message to start the conversation.
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#525252] text-xs sm:text-sm">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          <>
            {sortedMessages.map(m => {
              const msgAttachments = m.metadata?.attachments || [];
              return (
              <div
                key={m.id}
                className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-xl p-2.5 sm:p-3 ${
                    m.sender_id === user.id
                      ? 'bg-[#0F4C5C] text-white'
                      : 'bg-white text-[#1A1A1A] border border-[rgba(26,26,26,0.08)]'
                  }`}
                >
                  {m.content && <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
                  {msgAttachments.map(att => {
                    const isImage = att.type?.startsWith('image/');
                    if (isImage) {
                      return (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" key={att.url} className="block mt-1.5">
                          <img src={att.url} alt={att.name} className="max-w-full rounded-lg" style={{ maxHeight: 180, objectFit: 'cover' }} />
                        </a>
                      );
                    }
                    return (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" key={att.url}
                        className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg text-xs no-underline"
                        style={{ background: m.sender_id === user.id ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)', color: 'inherit' }}>
                        <span>📎</span>
                        <span className="truncate">{att.name || 'Attachment'}</span>
                      </a>
                    );
                  })}
                  <p
                    className={`text-xs mt-1 ${
                      m.sender_id === user.id
                        ? 'text-[rgba(255,255,255,0.7)]'
                        : 'text-[#8A8A8A]'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )})}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Attachment preview strip */}
      {attachments.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[rgba(26,26,26,0.06)] flex gap-2 flex-wrap bg-[#FAFAFA]">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1 bg-white border border-[rgba(26,26,26,0.1)] rounded-lg px-2 py-1 text-xs">
              {att.type?.startsWith('image/') ? (
                <img src={att.url} alt="" className="w-5 h-5 rounded object-cover" />
              ) : <span>📎</span>}
              <span className="max-w-[80px] truncate">{att.name}</span>
              <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                className="text-sm text-[#8A8A8A] hover:text-[#1A1A1A] ml-0.5" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-2.5 sm:p-4 border-t border-[rgba(26,26,26,0.08)] flex gap-2 sm:gap-3 items-end bg-white rounded-b-2xl">
        <input type="file" ref={fileInputRef} onChange={handleAttachmentUpload} multiple accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-[#525252] hover:text-[#1A1A1A] disabled:text-[#D0D0D0] transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '8px 2px', flexShrink: 0 }}
          title="Attach file"
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className={`${styles.input} flex-1 !py-2.5 sm:!py-3 text-sm`}
          style={{ resize: 'none', minHeight: 40, maxHeight: 120, overflow: 'auto', lineHeight: '1.4' }}
          rows={1}
          disabled={sending}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
        />
        <button
          type="submit"
          disabled={sending || (!newMessage.trim() && attachments.length === 0)}
          className="bg-[#E07A5F] hover:bg-[#C45F4A] disabled:bg-[#F5F2ED] disabled:text-[#8A8A8A] disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors text-sm sm:text-base"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
