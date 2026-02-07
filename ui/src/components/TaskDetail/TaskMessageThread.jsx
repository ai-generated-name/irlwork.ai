// Task Message Thread Component
// Always-visible messaging interface for task communication

import React, { useState, useRef, useEffect } from 'react';

const styles = {
  input: 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
};

export default function TaskMessageThread({
  conversation,
  messages,
  user,
  onSendMessage,
  onLoadMessages
}) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!conversation) return;

    const interval = setInterval(() => {
      onLoadMessages?.();
    }, 3000);

    return () => clearInterval(interval);
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
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-bold">Messages</h3>
        <p className="text-gray-400 text-sm">Chat with the agent about this task</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!conversation ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Send a message to start the conversation.
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          <>
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-xl p-3 ${
                    m.sender_id === user.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      m.sender_id === user.id
                        ? 'text-orange-100'
                        : 'text-gray-400'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className={`${styles.input} flex-1`}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
