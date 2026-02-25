// Task Detail Page
// Handles both open tasks (browsing/applying) and assigned tasks (messaging/proof)

import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import CountdownBanner from '../components/TaskDetail/CountdownBanner';
import TaskHeader from '../components/TaskDetail/TaskHeader';
import TaskTimeline from '../components/TaskDetail/TaskTimeline';
import AgentProfileCard from '../components/TaskDetail/AgentProfileCard';
import PaymentCard from '../components/TaskDetail/PaymentCard';
import ProofSection from '../components/TaskDetail/ProofSection';
import TaskMessageThread from '../components/TaskDetail/TaskMessageThread';
import QuickApplyModal from '../components/QuickApplyModal';
import { v4 } from '../components/V4Layout';
import { trackView } from '../utils/trackView';
import ReportTaskModal from '../components/ReportTaskModal';
import ShareOnXButton from '../components/ShareOnXButton';
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const isParticipant = user && task && (task.agent_id === user.id || task.human_id === user.id);

  // Fetch initial data
  useEffect(() => {
    if (!taskId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setLoadingTimeout(false);

      // Show timeout message after 15 seconds
      const timeoutId = setTimeout(() => setLoadingTimeout(true), 15000);

      try {
        // Fetch task details (works with or without auth)
        const headers = user?.id ? { Authorization: user.token || '' } : {};
        const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, { headers });
        if (!taskRes.ok) {
          const errBody = await taskRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Task not found (${taskRes.status})`);
        }
        const taskData = await taskRes.json();
        setTask(taskData);

        const isTaskParticipant = user && (taskData.agent_id === user.id || taskData.human_id === user.id);

        // Fetch agent profile for all viewers
        if (taskData.agent_id) {
          const agentHeaders = user?.id ? { Authorization: user.token || '' } : {};
          const agentRes = await fetch(`${API_URL}/users/${taskData.agent_id}`, { headers: agentHeaders });
          if (agentRes.ok) {
            const agentData = await agentRes.json();
            setAgentProfile(agentData);
          }
        }

        // Only fetch status, conversation for authenticated participants
        if (user && isTaskParticipant) {
          const statusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
            headers: { Authorization: user.token || '' }
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
        clearTimeout(timeoutId);
        setLoading(false);
        setLoadingTimeout(false);
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
                headers: { Authorization: user.token || '' }
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
        headers: { Authorization: user.token || '' }
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
        headers: { Authorization: user.token || '' }
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
            headers: { Authorization: user.token || '' }
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
            Authorization: user.token || ''
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
          Authorization: user.token || ''
        },
        body: JSON.stringify({ conversation_id: convId, content })
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
          Authorization: user.token || ''
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#F5F2ED] border-t-[#0F4C5C] rounded-full animate-spin mb-4"></div>
          <div className="text-[#525252] text-lg">Loading task details...</div>
          {loadingTimeout && (
            <div className="mt-4 text-center">
              <p className="text-[#8A8A8A] text-sm mb-2">This is taking longer than expected. Check your connection.</p>
              <button
                onClick={() => window.location.reload()}
                className="text-[#0F4C5C] underline text-sm hover:text-[#0A3540]"
              >
                Retry
              </button>
            </div>
          )}
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

  // Guard against task being null after loading completes (shouldn't happen, but defensive)
  if (!task) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#DC2626] text-xl mb-4">Error: Task not found</div>
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
      {/* Navbar — uses global navbar-v4 CSS classes */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>
        <div className="nav-links-v4" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/connect-agent" className="nav-link-v4">For Agents</a>
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
        marginTop: 56,
        background: 'white',
        zIndex: 10,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        <div className="h-10 sm:h-14" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate?.('/dashboard')}
            className="flex items-center gap-1.5 sm:gap-2 text-[#E07A5F] bg-transparent border-none cursor-pointer text-xs sm:text-sm font-medium"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            {task && (
              <ShareOnXButton task={task} variant="icon-text" />
            )}
            {user && task && task.agent_id !== user.id && (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 text-[#8A8A8A] bg-transparent border-none cursor-pointer text-xs"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report
              </button>
            )}
            <span className="text-[#8A8A8A] text-xs hidden sm:inline">
              Task ID: {taskId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-3 pt-4 pb-24 sm:px-4 sm:pt-8 lg:pb-8 mt-14" style={{ maxWidth: 1280 }}>
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Column - Task Details (60%) */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4 lg:space-y-6">
            <TaskHeader task={task} />

            {/* Task Timeline - only for participants once task is past open */}
            {isParticipant && task.status !== 'open' && (
              <TaskTimeline task={task} taskStatus={taskStatus} />
            )}

            {/* Mobile-only: Payment card right after header so Apply is visible early */}
            <div className="lg:hidden">
              <PaymentCard
                task={task}
                user={user}
                isParticipant={isParticipant}
                onApply={() => setShowApplyModal(true)}
                taskId={taskId}
              />
            </div>

            {/* Countdown Banner (participant only, during dispute window) */}
            {taskStatus?.dispute_window_info && (
              <CountdownBanner disputeWindowInfo={taskStatus.dispute_window_info} />
            )}

            {/* Show proof section if in progress, or status badge if submitted (participants only) */}
            {isParticipant && task.status === 'in_progress' && (
              <ProofSection task={task} user={user} onSubmit={handleSubmitProof} />
            )}

            {/* Messages - in left column beneath task info (participants only) */}
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

          {/* Right Column - Payment, Stats, Agent Profile */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Payment Card - hidden on mobile (shown inline above), visible on desktop sidebar */}
            <div className="hidden lg:block">
              <PaymentCard
                task={task}
                user={user}
                isParticipant={isParticipant}
                onApply={() => setShowApplyModal(true)}
                taskId={taskId}
              />
            </div>

            {/* Agent Profile Card */}
            <AgentProfileCard agent={agentProfile} isAnonymous={task?.is_anonymous} />
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
        userToken={user?.token || user?.id}
      />

      {/* Mobile Sticky Apply Bar */}
      {task.status === 'open' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(26,26,26,0.12)] px-4 pr-20 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-xl font-bold text-[#059669] font-mono">
                ${Number(task.budget) || 0}
              </span>
              {task.budget_type === 'hourly' && <span className="text-sm text-[#525252]">/hr</span>}
              <span className="text-xs text-[#8A8A8A] ml-1">{task.payment_method === 'stripe' ? 'USD' : 'USDC'}</span>
            </div>
            {user && task.agent_id !== user.id && !hasApplied ? (
              <button
                onClick={() => setShowApplyModal(true)}
                className="flex-1 max-w-[200px] py-2.5 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-sm shadow-md"
              >
                Apply for This Task
              </button>
            ) : hasApplied ? (
              <span className="text-sm font-medium text-[#059669]">Applied ✓</span>
            ) : !user ? (
              <a
                href="/auth"
                className="flex-1 max-w-[200px] py-2.5 bg-[#E07A5F] hover:bg-[#C45F4A] text-white font-bold rounded-xl transition-colors text-sm shadow-md text-center no-underline block"
              >
                Sign In to Apply
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
