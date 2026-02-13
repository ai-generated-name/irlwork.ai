// Task Message Thread Component
// Always-visible messaging interface for task communication

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

const styles = {
  input: 'w-full bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] transition-colors'
};

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
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3 seconds, pausing when tab is hidden
  useEffect(() => {
    if (!conversation) return;

    let interval = null;
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => { onLoadMessages?.(); }, 3000);
    };
    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        onLoadMessages?.(); // Fetch immediately on return
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [conversation, onLoadMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Sort messages by created_at to guarantee order
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
            {sortedMessages.map(m => (
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
                  <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
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
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-2.5 sm:p-4 border-t border-[rgba(26,26,26,0.08)] flex gap-2 sm:gap-3 items-end bg-white rounded-b-2xl">
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
          disabled={sending || !newMessage.trim()}
          className="bg-[#E07A5F] hover:bg-[#C45F4A] disabled:bg-[#F5F2ED] disabled:text-[#8A8A8A] disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-colors text-sm sm:text-base"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
