// Task Message Thread Component
// Always-visible messaging interface for task communication

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '../ui';
import { useToast } from '../../context/ToastContext';

const styles = {
  input: 'w-full bg-white border-2 border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#888888] focus:outline-none focus:border-[#E8853D] transition-colors'
};

export default function TaskMessageThread({
  conversation,
  messages,
  user,
  onSendMessage,
  onLoadMessages,
  isHiringMode = false,
}) {
  const toast = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // 'sent' | 'failed' | null
  const [failedMessage, setFailedMessage] = useState(null);
  const [pollingStatus, setPollingStatus] = useState('active'); // 'active' | 'error'
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastReadTimestamp] = useState(() => {
    if (!conversation?.id) return null;
    return localStorage.getItem(`irlwork_lastRead_${conversation?.id}`) || null;
  });
  const messagesEndRef = useRef(null);

  // Sort messages by created_at to guarantee order — compute early so effects can use it
  const sortedMessages = useMemo(
    () => [...(messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3 seconds, pausing when tab is hidden
  useEffect(() => {
    if (!conversation) return;

    let interval = null;
    const pollMessages = async () => {
      try {
        await onLoadMessages?.();
        setPollingStatus('active');
        if (isInitialLoad) setIsInitialLoad(false);
      } catch {
        setPollingStatus('error');
      }
    };
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(pollMessages, 3000);
    };
    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollMessages();
        startPolling();
      } else {
        stopPolling();
      }
    };

    pollMessages();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [conversation, onLoadMessages]);

  // Persist last-read timestamp
  useEffect(() => {
    if (sortedMessages.length > 0 && conversation?.id) {
      const latestTimestamp = sortedMessages[sortedMessages.length - 1].created_at;
      localStorage.setItem(`irlwork_lastRead_${conversation.id}`, latestTimestamp);
    }
  }, [sortedMessages, conversation?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage;
    setSending(true);
    setSendStatus(null);
    setFailedMessage(null);
    try {
      await onSendMessage(messageText);
      setNewMessage('');
      setSendStatus('sent');
      // Clear the success indicator after 2 seconds
      setTimeout(() => setSendStatus(null), 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendStatus('failed');
      setFailedMessage(messageText);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const retryFailedMessage = async () => {
    if (!failedMessage) return;
    setSending(true);
    setSendStatus(null);
    try {
      await onSendMessage(failedMessage);
      setNewMessage('');
      setFailedMessage(null);
      setSendStatus('sent');
      setTimeout(() => setSendStatus(null), 2000);
    } catch (error) {
      console.error('Error retrying message:', error);
      setSendStatus('failed');
      toast.error('Still unable to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Find the "new messages" divider position
  const newMessagesDividerIndex = useMemo(() => {
    if (!lastReadTimestamp) return -1;
    const idx = sortedMessages.findIndex(m =>
      m.sender_id !== user.id && new Date(m.created_at) > new Date(lastReadTimestamp)
    );
    return idx;
  }, [sortedMessages, lastReadTimestamp, user.id]);

  return (
    <div className="bg-white rounded-2xl border-2 border-[rgba(0,0,0,0.08)] flex flex-col h-[320px] sm:h-[420px] lg:h-[500px] shadow-sm">
      {/* Header */}
      <div className="px-3 py-2.5 sm:p-4 border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between">
        <div>
          <h3 className="text-[#1A1A1A] font-bold text-sm sm:text-base">Messages</h3>
          <p className="text-[#333333] text-xs sm:text-sm">
            Chat with the {isHiringMode ? 'worker' : 'agent'} about this task
          </p>
        </div>
        {/* Live polling indicator */}
        {conversation && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                pollingStatus === 'active' ? 'bg-[#16A34A]' : 'bg-[#FEBC2E]'
              }`}
              style={pollingStatus === 'active' ? { animation: 'pulse-dot 2s ease-in-out infinite' } : {}}
            />
            <span className="text-[10px] sm:text-xs text-[#888888]" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              {pollingStatus === 'active' ? 'Live' : 'Reconnecting'}
            </span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#FAFAF8]">
        {!conversation && isInitialLoad ? (
          <div className="flex items-center justify-center h-full text-[#888888] text-xs sm:text-sm">
            Loading messages...
          </div>
        ) : !conversation ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[#F5F3F0] flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-[#333333] text-xs sm:text-sm font-medium mb-1">No messages yet</p>
            <p className="text-[#888888] text-xs max-w-[240px]">
              {isHiringMode
                ? 'Messages from the assigned worker will appear here.'
                : 'Send a message to start the conversation. The task creator will be notified.'}
            </p>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[#F5F3F0] flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-[#333333] text-xs sm:text-sm font-medium mb-1">No messages yet</p>
            <p className="text-[#888888] text-xs">Be the first to send a message</p>
          </div>
        ) : (
          <>
            {sortedMessages.map((m, idx) => (
              <React.Fragment key={m.id}>
                {/* New messages divider */}
                {idx === newMessagesDividerIndex && idx > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
                    <div className="flex-1 h-px bg-[#E8853D] opacity-30" />
                    {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
                    <span className="text-[10px] font-medium text-[#E8853D] px-2">New</span>
                    {/* eslint-disable-next-line irlwork/no-orange-outside-button -- brand accent color */}
                    <div className="flex-1 h-px bg-[#E8853D] opacity-30" />
                  </div>
                )}
                <div className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  {/* eslint-disable irlwork/no-orange-outside-button -- message bubble uses brand color */}
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-xl p-2.5 sm:p-3 ${
                      m.sender_id === user.id
                        ? 'bg-[#E8853D] text-white'
                        : 'bg-white text-[#1A1A1A] border border-[rgba(0,0,0,0.08)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                    {/* Render attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {m.attachments.map((att, attIdx) => {
                          const isImage = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename);
                          return isImage ? (
                            <a key={attIdx} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={att.url} alt={att.filename} className="max-w-[200px] max-h-[150px] rounded-lg border border-[rgba(26,26,26,0.08)]" />
                            </a>
                          ) : (
                            <a
                              key={attIdx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${
                                m.sender_id === user.id
                                  ? 'bg-[rgba(255,255,255,0.15)] text-white hover:bg-[rgba(255,255,255,0.25)]'
                                  : 'bg-[#F5F2ED] text-[#0F4C5C] hover:bg-[#EDE9E3]'
                              } transition-colors`}
                            >
                              <Paperclip size={14} />
                              <span className="truncate max-w-[150px]">{att.filename}</span>
                              {att.size > 0 && <span className="opacity-60">({(att.size / 1024).toFixed(0)}KB)</span>}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        m.sender_id === user.id
                          ? 'text-[rgba(255,255,255,0.7)]'
                          : 'text-[#888888]'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* eslint-enable irlwork/no-orange-outside-button */}
                </div>
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Failed message retry bar */}
      {sendStatus === 'failed' && failedMessage && (
        <div className="px-3 py-2 bg-[rgba(255,95,87,0.06)] border-t border-[rgba(255,95,87,0.12)] flex items-center justify-between">
          <span className="text-xs text-[#FF5F57]">Message failed to send</span>
          {/* eslint-disable irlwork/no-orange-outside-button -- retry button text uses brand color */}
          <button
            onClick={retryFailedMessage}
            disabled={sending}
            className="text-xs font-medium text-[#E8853D] hover:text-[#D4703A]"
          >
            Retry
          </button>
          {/* eslint-enable irlwork/no-orange-outside-button */}
        </div>
      )}

      {/* Message Input — sticky within container */}
      <form onSubmit={handleSubmit} className="p-2.5 sm:p-4 border-t border-[rgba(0,0,0,0.08)] flex gap-2 sm:gap-3 items-end bg-white rounded-b-2xl sticky bottom-0 z-10">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          aria-label="Type a message"
          className={`${styles.input} flex-1 !py-2.5 sm:!py-3 text-sm`}
          style={{ resize: 'none', minHeight: 44, maxHeight: 120, overflow: 'auto', lineHeight: '1.4' }}
          rows={1}
          disabled={sending}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={sending || !newMessage.trim()}
          className="px-4 sm:px-6 font-bold text-sm sm:text-base gap-1.5"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          {sending ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : sendStatus === 'sent' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            'Send'
          )}
        </Button>
      </form>

      {/* Pulse animation for live dot */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
