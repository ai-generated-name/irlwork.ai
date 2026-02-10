// Task Detail Page
// Central hub for viewing task info, agent profile, communication, and proof submission

import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import CountdownBanner from '../components/TaskDetail/CountdownBanner';
import TaskHeader from '../components/TaskDetail/TaskHeader';
import PosterInfoBar from '../components/TaskDetail/PosterInfoBar';
import DescriptionSection from '../components/TaskDetail/DescriptionSection';
import LocationSection from '../components/TaskDetail/LocationSection';
import RequirementsSection from '../components/TaskDetail/RequirementsSection';
import StatsSection from '../components/TaskDetail/StatsSection';
import BudgetCard from '../components/TaskDetail/BudgetCard';
import AgentProfileCard from '../components/TaskDetail/AgentProfileCard';
import EscrowDisplay from '../components/TaskDetail/EscrowDisplay';
import ProofSection from '../components/TaskDetail/ProofSection';
import ProofStatusBadge from '../components/TaskDetail/ProofStatusBadge';
import TaskMessageThread from '../components/TaskDetail/TaskMessageThread';
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

  // Fetch initial data
  useEffect(() => {
    if (!taskId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch task details (now includes embedded poster data)
        const headers = user ? { Authorization: user.id } : {};
        const taskRes = await fetch(`${API_URL}/tasks/${taskId}`, { headers });
        if (!taskRes.ok) throw new Error('Task not found');
        const taskData = await taskRes.json();
        setTask(taskData);

        // Fetch task status (includes proof info and dispute window) - only if logged in
        if (user) {
          const statusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
            headers: { Authorization: user.id }
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setTaskStatus(statusData);
          }
        }

        // Fetch full agent profile for the detailed card (unless anonymous)
        if (taskData.agent_id && !taskData.is_anonymous && user) {
          const agentRes = await fetch(`${API_URL}/users/${taskData.agent_id}`, {
            headers: { Authorization: user.id }
          });
          if (agentRes.ok) {
            const agentData = await agentRes.json();
            setAgentProfile(agentData);
          }
        }

        // Fetch or create conversation for this task (only if logged in)
        if (user) {
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
    if (!taskId) return;

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

  // Load messages (supports incremental polling)
  const loadMessages = async (conversationId, incremental = false) => {
    if (!conversationId) return;

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

  const isParticipant = user && task && (task.agent_id === user.id || task.human_id === user.id);

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
  if (error || !task) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-[#1A1A1A] text-xl font-bold mb-2">Task Not Found</div>
          <div className="text-[#525252] mb-6">{error || 'This task may have been removed.'}</div>
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A]" style={{ fontFamily: v4.fonts.display }}>
      {/* V4 Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-[rgba(250,248,245,0.95)] backdrop-blur-lg border-b border-[rgba(26,26,26,0.1)]">
        <a href="/" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 bg-[#0F4C5C] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
            irl
          </div>
          <span className="text-lg font-extrabold text-[#1A1A1A] tracking-tight hidden sm:inline">irlwork.ai</span>
        </a>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="/mcp" className="text-[#525252] no-underline text-sm font-medium hover:text-[#1A1A1A] transition-colors hidden sm:inline">For Agents</a>
          <a href="/dashboard?tab=browse" className="text-[#525252] no-underline text-sm font-medium hover:text-[#1A1A1A] transition-colors hidden sm:inline">Browse Tasks</a>
          {user ? (
            <a href="/dashboard" className="px-4 py-2 bg-[#E07A5F] rounded-xl text-white font-semibold text-sm shadow-md hover:bg-[#C45F4A] transition-colors no-underline">
              Dashboard
            </a>
          ) : (
            <a href="/auth" className="px-4 py-2 bg-[#E07A5F] rounded-xl text-white font-semibold text-sm shadow-md hover:bg-[#C45F4A] transition-colors no-underline">
              Sign In
            </a>
          )}
        </div>
      </nav>

      {/* Sub-header with back button */}
      <header className="border-b border-[rgba(26,26,26,0.08)] sticky top-[72px] bg-white z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate?.('/dashboard?tab=browse')}
            className="flex items-center gap-2 text-[#E07A5F] hover:text-[#C45F4A] transition-colors text-sm font-medium"
          >
            <span>←</span>
            <span>Back to Tasks</span>
          </button>
          <div className="flex items-center gap-4">
            {user && task && task.agent_id !== user.id && (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-[#8A8A8A] hover:text-[#DC2626] transition-colors text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Report
              </button>
            )}
            <div className="text-[#8A8A8A] text-sm">
              Task ID: {taskId.slice(0, 8)}...
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 mt-[72px]">
        {/* Countdown Banner (only when pending review) */}
        {taskStatus?.dispute_window_info && (
          <CountdownBanner disputeWindowInfo={taskStatus.dispute_window_info} />
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Task Details (60%) */}
          <div className="lg:col-span-3">
            <PosterInfoBar task={task} />
            <TaskHeader task={task} />
            <DescriptionSection task={task} />
            <LocationSection task={task} />
            <RequirementsSection task={task} />
            <StatsSection taskId={taskId} />

            {/* Proof section - only for participants */}
            {isParticipant && task.status === 'in_progress' && user && task.human_id === user.id && (
              <ProofSection task={task} user={user} onSubmit={handleSubmitProof} />
            )}
            {isParticipant && task.status !== 'in_progress' && (
              <ProofStatusBadge task={task} proofs={taskStatus?.proofs} />
            )}
          </div>

          {/* Right Column - Budget, Agent Info & Messaging (40%) */}
          <div className="lg:col-span-2 space-y-4">
            <BudgetCard
              task={task}
              user={user}
              onApply={() => onNavigate?.('/dashboard?tab=browse')}
            />
            <AgentProfileCard
              agent={agentProfile || task.poster}
              isAnonymous={task.is_anonymous}
            />
            {isParticipant && (
              <>
                <EscrowDisplay task={task} />
                <TaskMessageThread
                  conversation={conversation}
                  messages={messages}
                  user={user}
                  onSendMessage={handleSendMessage}
                  onLoadMessages={() => conversation && loadMessages(conversation.id, true)}
                />
              </>
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
    </div>
  );
}
