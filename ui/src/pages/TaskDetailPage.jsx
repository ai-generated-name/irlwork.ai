// Task Detail Page
// Handles both open tasks (browsing/applying) and assigned tasks (messaging/proof)

import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import CountdownBanner from '../components/TaskDetail/CountdownBanner';
import TaskHeader from '../components/TaskDetail/TaskHeader';
import AgentProfileCard from '../components/TaskDetail/AgentProfileCard';
import EscrowDisplay from '../components/TaskDetail/EscrowDisplay';
import ProofSection from '../components/TaskDetail/ProofSection';
import ProofStatusBadge from '../components/TaskDetail/ProofStatusBadge';
import TaskMessageThread from '../components/TaskDetail/TaskMessageThread';
import QuickApplyModal from '../components/QuickApplyModal';
import { v4 } from '../components/V4Layout';
import { trackView } from '../utils/trackView';
import ReportTaskModal from '../components/ReportTaskModal';
import API_URL from '../config/api';

export default function TaskDetailPage({ user, taskId, onNavigate }) {
  const [task, setTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const isParticipant = user && task && (task.agent_id === user.id || task.human_id === user.id);

  // Fetch initial data
  useEffect(() => {
    if (!taskId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch task details (works with or without auth)
        const headers = user ? { Authorization: user.id } : {};
        const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, { headers });
        if (!taskRes.ok) throw new Error('Task not found');
        const taskData = await taskRes.json();
        setTask(taskData);

        const isTaskParticipant = user && (taskData.agent_id === user.id || taskData.human_id === user.id);

        // Fetch agent profile for all viewers
        if (taskData.agent_id) {
          const agentHeaders = user ? { Authorization: user.id } : {};
          const agentRes = await fetch(`${API_URL}/users/${taskData.agent_id}`, { headers: agentHeaders });
          if (agentRes.ok) {
            const agentData = await agentRes.json();
            setAgentProfile(agentData);
          }
        }

        // Only fetch status, conversation for authenticated participants
        if (user && isTaskParticipant) {
          const statusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
            headers: { Authorization: user.id }
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setTaskStatus(statusData);
          }

          await loadConversation(taskData);
        }

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

  // Real-time subscription for task changes
  useEffect(() => {
    if (!taskId || !supabase) return;

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        async (payload) => {
          setTask(prev => prev ? { ...prev, ...payload.new } : payload.new);

          if (user) {
            try {
              const statusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
                headers: { Authorization: user.id }
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                setTaskStatus(statusData);
              }
            } catch (err) {
              console.error('Error refreshing task status:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, user]);

  // Load conversation and messages
  const loadConversation = async (taskData) => {
    if (!user) return;
    try {
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
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId, incremental = false) => {
    if (!conversationId || !user) return;

    try {
      let url = `${API_URL}/messages/${conversationId}?limit=50`;
      if (incremental && lastMessageTime) {
        url += `&after_time=${encodeURIComponent(lastMessageTime)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: user.id }
      });

      if (res.ok) {
        const data = await res.json();
        const newMessages = data || [];

        if (incremental && lastMessageTime) {
          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
            setLastMessageTime(newMessages[newMessages.length - 1].created_at);
          }
        } else {
          setMessages(newMessages);
          if (newMessages.length > 0) {
            setLastMessageTime(newMessages[newMessages.length - 1].created_at);
          } else {
            setLastMessageTime(new Date().toISOString());
          }

          fetch(`${API_URL}/conversations/${conversationId}/read-all`, {
            method: 'PUT',
            headers: { Authorization: user.id }
          }).catch(() => {});
        }
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

  // Format relative time
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
    <div className="landing-v4 min-h-screen" style={{ fontFamily: v4.fonts.display }}>
      {/* Navbar — same as dashboard */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>
        <div className="nav-links-v4" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/mcp" className="nav-link-v4">For Agents</a>
          <a href="/dashboard" className="nav-link-v4">Browse Tasks</a>
          {user ? (
            <a href="/dashboard" className="v4-btn v4-btn-primary v4-btn-sm" style={{ textDecoration: 'none' }}>
              Dashboard
            </a>
          ) : (
            <a href="/auth" className="v4-btn v4-btn-primary v4-btn-sm" style={{ textDecoration: 'none' }}>
              Sign In
            </a>
          )}
        </div>
      </nav>

      {/* Sub-header with back button */}
      <header style={{
        borderBottom: '1px solid rgba(26,26,26,0.08)',
        position: 'sticky',
        top: 56,
        background: 'white',
        zIndex: 10,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate?.('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E07A5F', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            <span>←</span>
            <span>Back to Tasks</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user && task && task.agent_id !== user.id && (
              <button
                onClick={() => setShowReportModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8A8A8A', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report
              </button>
            )}
            <span style={{ color: '#8A8A8A', fontSize: 13 }}>
              Task ID: {taskId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px', marginTop: 56 }}>
        {/* Countdown Banner (only when pending review) */}
        {taskStatus?.dispute_window_info && (
          <CountdownBanner disputeWindowInfo={taskStatus.dispute_window_info} />
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Task Details (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <TaskHeader task={task} />

            {/* Apply button for open tasks (logged-in non-participant) */}
            {task.status === 'open' && user && !isParticipant && (
              <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 shadow-sm">
                <button
                  onClick={() => setShowApplyModal(true)}
                  disabled={hasApplied}
                  className="w-full bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasApplied ? '✓ Applied' : 'Apply for This Task'}
                </button>
              </div>
            )}

            {/* Sign in prompt for open tasks (guest) */}
            {task.status === 'open' && !user && (
              <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 shadow-sm">
                <a
                  href="/auth"
                  className="block w-full bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold py-3 px-6 rounded-xl transition-colors text-center no-underline"
                >
                  Sign In to Apply
                </a>
              </div>
            )}

            {/* Show proof section if in progress, or status badge if submitted (participants only) */}
            {isParticipant && task.status === 'in_progress' && (
              <ProofSection task={task} user={user} onSubmit={handleSubmitProof} />
            )}
            {isParticipant && task.status !== 'in_progress' && (
              <ProofStatusBadge task={task} proofs={taskStatus?.proofs} />
            )}

            {/* Messages - in left column beneath task info */}
            {isParticipant && (
              <TaskMessageThread
                conversation={conversation}
                messages={messages}
                user={user}
                onSendMessage={handleSendMessage}
                onLoadMessages={() => conversation && loadMessages(conversation.id, true)}
              />
            )}
          </div>

          {/* Right Column - Budget, Stats, Agent Profile, Escrow (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Budget Card with posted date */}
            <div className="bg-white rounded-2xl border-2 border-[rgba(26,26,26,0.08)] p-6 shadow-sm text-center">
              <div className="text-4xl font-bold text-[#059669] font-mono">
                ${task.budget || 0}
              </div>
              <div className="text-[#525252] text-sm mt-1">USDC</div>
              <div className="text-[#8A8A8A] text-xs mt-1">
                {task.budget_type === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
              </div>
              <div className="border-t border-[rgba(26,26,26,0.08)] mt-4 pt-3">
                <span className="text-[#8A8A8A] text-xs">
                  Posted {getTimeAgo(task.created_at)}
                </span>
              </div>
            </div>

            {/* Agent Profile Card */}
            <AgentProfileCard agent={agentProfile} />

            {/* Escrow Display (participants only) */}
            {isParticipant && (
              <EscrowDisplay task={task} />
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      <ReportTaskModal
        task={task}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userToken={user?.id}
      />

      {/* Apply Modal */}
      <QuickApplyModal
        task={task}
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => setHasApplied(true)}
        userToken={user?.id}
      />
    </div>
  );
}
