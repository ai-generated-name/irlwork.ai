// Task Detail Page
// Central hub for workers to view task info, communicate with agents, and submit proof

import React, { useState, useEffect } from 'react';
import CountdownBanner from '../components/TaskDetail/CountdownBanner';
import TaskHeader from '../components/TaskDetail/TaskHeader';
import AgentProfileCard from '../components/TaskDetail/AgentProfileCard';
import EscrowDisplay from '../components/TaskDetail/EscrowDisplay';
import ProofSection from '../components/TaskDetail/ProofSection';
import ProofStatusBadge from '../components/TaskDetail/ProofStatusBadge';
import TaskMessageThread from '../components/TaskDetail/TaskMessageThread';
import { trackView } from '../utils/trackView';
import API_URL from '../config/api';

export default function TaskDetailPage({ user, taskId, onNavigate }) {
  const [task, setTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);

  // Fetch initial data
  useEffect(() => {
    if (!taskId || !user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch task details
        const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, {
          headers: { Authorization: user.id }
        });
        if (!taskRes.ok) throw new Error('Task not found');
        const taskData = await taskRes.json();
        setTask(taskData);

        // Fetch task status (includes proof info and dispute window)
        const statusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
          headers: { Authorization: user.id }
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setTaskStatus(statusData);
        }

        // Fetch agent profile (from users table)
        if (taskData.agent_id) {
          const agentRes = await fetch(`${API_URL}/users/${taskData.agent_id}`, {
            headers: { Authorization: user.id }
          });
          if (agentRes.ok) {
            const agentData = await agentRes.json();
            setAgentProfile(agentData);
          }
        }

        // Fetch or create conversation for this task
        await loadConversation(taskData);

      } catch (err) {
        console.error('Error fetching task data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId, user]);

  // Track page view
  useEffect(() => {
    if (taskId) {
      trackView('task', taskId);
    }
  }, [taskId]);

  // Load conversation and messages
  const loadConversation = async (taskData) => {
    try {
      // Try to get existing conversation for this task
      const convRes = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: user.id }
      });

      if (convRes.ok) {
        const conversations = await convRes.json();
        const taskConv = conversations.find(c => c.task_id === taskId);

        if (taskConv) {
          setConversation(taskConv);
          await loadMessages(taskConv.id);
        }
        // If no conversation exists yet, it will be created when first message is sent
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      const res = await fetch(`${API_URL}/messages/${conversationId}`, {
        headers: { Authorization: user.id }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Send a message
  const handleSendMessage = async (content) => {
    if (!user || !task) return;

    try {
      let convId = conversation?.id;

      // Create conversation if it doesn't exist
      if (!convId) {
        const createConvRes = await fetch(`${API_URL}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: user.id
          },
          body: JSON.stringify({
            agent_id: task.agent_id,
            task_id: taskId,
            title: `Task: ${task.title}`
          })
        });

        if (createConvRes.ok) {
          const newConv = await createConvRes.json();
          convId = newConv.id;
          setConversation(newConv);
        } else {
          throw new Error('Failed to create conversation');
        }
      }

      // Send message
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          conversation_id: convId,
          content: content
        })
      });

      if (res.ok) {
        // Reload messages
        await loadMessages(convId);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  // Submit proof
  const handleSubmitProof = async ({ proofText, proofUrls }) => {
    if (!taskId || !user) return;

    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/submit-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          proof_text: proofText,
          proof_urls: proofUrls || []
        })
      });

      if (res.ok) {
        // Reload task data
        window.location.reload();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit proof');
      }
    } catch (err) {
      console.error('Error submitting proof:', err);
      throw err;
    }
  };

  // Update countdown timer
  useEffect(() => {
    if (!taskStatus?.dispute_window_info?.dispute_window_closes_at) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const closesAt = new Date(taskStatus.dispute_window_info.dispute_window_closes_at);
      const remaining = closesAt - now;

      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setCountdown({ hours, minutes, seconds });
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [taskStatus]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#F5F2ED] border-t-[#0F4C5C] rounded-full animate-spin mb-4"></div>
          <div className="text-[#525252] text-lg">Loading task details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#DC2626] text-xl mb-4">Error: {error}</div>
          <button
            onClick={() => onNavigate?.('/dashboard')}
            className="bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold py-2 px-6 rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A]">
      {/* Header */}
      <header className="border-b border-[rgba(26,26,26,0.08)] sticky top-0 bg-white z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.('/dashboard')}
            className="flex items-center gap-2 text-[#525252] hover:text-[#1A1A1A] transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          <div className="text-[#8A8A8A] text-sm">
            Task ID: {taskId.slice(0, 8)}...
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Countdown Banner (only when pending review) */}
        {taskStatus?.dispute_window_info && (
          <CountdownBanner disputeWindowInfo={taskStatus.dispute_window_info} />
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Task Details (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <TaskHeader task={task} />

            {/* Show proof section if in progress, or status badge if submitted */}
            {task.status === 'in_progress' ? (
              <ProofSection task={task} onSubmit={handleSubmitProof} />
            ) : (
              <ProofStatusBadge task={task} proofs={taskStatus?.proofs} />
            )}
          </div>

          {/* Right Column - Actions & Messaging (40%) */}
          <div className="lg:col-span-2 space-y-4">
            <AgentProfileCard agent={agentProfile} />
            <EscrowDisplay task={task} />
            <TaskMessageThread
              conversation={conversation}
              messages={messages}
              user={user}
              onSendMessage={handleSendMessage}
              onLoadMessages={() => conversation && loadMessages(conversation.id)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
