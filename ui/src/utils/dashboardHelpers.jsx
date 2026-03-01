// Extracted from Dashboard.jsx — status display helpers and notification icon map
import React from 'react'
import {
  ClipboardList, FileText, CheckCircle, XCircle, DollarSign,
  ArrowDownLeft, Landmark, Scale, Star, MessageCircle, Ban,
  Sparkles, Handshake, Hourglass, UserPlus, UserX, Clock,
  Zap, PlayCircle, Wallet, AlertTriangle, CalendarDays,
  CreditCard, Shield, Bot, KeyRound
} from 'lucide-react'

/**
 * Returns Tailwind CSS class string for a task status badge.
 * @param {string} status - Task status key
 * @returns {string} Tailwind class string
 */
export function getTaskStatus(status) {
  const colors = {
    open: 'bg-teal/10 text-teal',
    accepted: 'bg-purple-100 text-purple-600',
    in_progress: 'bg-amber-100 text-amber-600',
    pending_review: 'bg-coral/10 text-coral',
    completed: 'bg-green-100 text-[#16A34A]',
    paid: 'bg-[#F3F4F6] text-[#6B7280]',
    disputed: 'bg-red-100 text-[#DC2626]',
  }
  return colors[status] || 'bg-[#F3F4F6] text-[#6B7280]'
}

/**
 * Returns a human-readable label for a task status.
 * @param {string} status - Task status key
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status) {
  const labels = {
    open: 'Open',
    pending_acceptance: 'Pending Acceptance',
    accepted: 'Accepted',
    in_progress: 'In Progress',
    pending_review: 'Pending Review',
    completed: 'Completed',
    paid: 'Paid',
    disputed: 'Disputed',
  }
  return labels[status] || status
}

/**
 * Map of notification type to icon element.
 * Used in the notification dropdown and notification list.
 */
export const NOTIFICATION_ICONS = {
  // Tasks — Core Lifecycle
  task_match: <Sparkles size={18} />,
  task_assigned: <ClipboardList size={18} />,
  task_offered: <Handshake size={18} />,
  task_accepted: <CheckCircle size={18} />,
  task_declined: <XCircle size={18} />,
  task_started: <PlayCircle size={18} />,
  task_cancelled: <Ban size={18} />,
  task_expired: <Hourglass size={18} />,
  task_offer_expired: <Hourglass size={18} />,
  task_auto_hidden: <AlertTriangle size={18} />,
  task_completed: <CheckCircle size={18} />,
  task_auto_approved: <CheckCircle size={18} />,
  auto_released: <Zap size={18} />,
  worker_cancelled: <UserX size={18} />,

  // Tasks — Applications
  new_application: <UserPlus size={18} />,
  application_rejected: <UserX size={18} />,
  application_declined: <UserX size={18} />,

  // Tasks — Proofs
  proof_submitted: <FileText size={18} />,
  proof_approved: <CheckCircle size={18} />,
  proof_rejected: <XCircle size={18} />,
  proof_submitted_late: <Clock size={18} />,

  // Tasks — Extensions & Deadlines
  extension_requested: <CalendarDays size={18} />,
  extension_approved: <CheckCircle size={18} />,
  extension_declined: <XCircle size={18} />,
  deadline_extended: <CalendarDays size={18} />,
  deadline_approaching: <Clock size={18} />,
  deadline_passed: <AlertTriangle size={18} />,

  // Payments
  payment_released: <DollarSign size={18} />,
  payment_received: <DollarSign size={18} />,
  payment_pending: <DollarSign size={18} />,
  payment_approved: <DollarSign size={18} />,
  payment_confirmed: <CheckCircle size={18} />,
  payment_failed: <AlertTriangle size={18} />,
  payment_sent: <ArrowDownLeft size={18} />,
  transfer_failed: <AlertTriangle size={18} />,
  payout_failed: <AlertTriangle size={18} />,
  payout_completed: <Wallet size={18} />,
  payout_paid: <Wallet size={18} />,
  deposit_confirmed: <Landmark size={18} />,
  auth_hold_failed: <KeyRound size={18} />,
  balance_available: <DollarSign size={18} />,
  withdrawal_completed: <Wallet size={18} />,
  payment_method_added: <CreditCard size={18} />,
  subscription_activated: <CreditCard size={18} />,

  // Messages
  new_message: <MessageCircle size={18} />,

  // Reviews
  rating_received: <Star size={18} />,
  rating_visible: <Star size={18} />,
  review_reminder: <Shield size={18} />,

  // Disputes
  dispute: <Scale size={18} />,
  dispute_opened: <Scale size={18} />,
  dispute_filed: <Scale size={18} />,
  dispute_created: <Scale size={18} />,
  dispute_resolved: <CheckCircle size={18} />,

  // System / Admin
  critical_feedback: <AlertTriangle size={18} />,
  report_submitted: <Shield size={18} />,
  new_task_report: <AlertTriangle size={18} />,
  agent_error: <Bot size={18} />,
  manual_payment_required: <AlertTriangle size={18} />,
  moderation_action: <Shield size={18} />,
  report_reviewed: <Shield size={18} />,
  task_under_review: <Shield size={18} />,

  // Legacy aliases
  assignment_cancelled: <Ban size={18} />,
  refund_processed: <ArrowDownLeft size={18} />,
}
