// Extracted from Dashboard.jsx — status display helpers and notification icon map
import React from 'react'
import {
  ClipboardList, FileText, CheckCircle, XCircle, DollarSign,
  ArrowDownLeft, Landmark, Scale, Star, MessageCircle, Ban
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
  task_assigned: <ClipboardList size={18} />,
  proof_submitted: <FileText size={18} />,
  proof_approved: <CheckCircle size={18} />,
  proof_rejected: <XCircle size={18} />,
  payment_released: <DollarSign size={18} />,
  payment_approved: <DollarSign size={18} />,
  payment_sent: <ArrowDownLeft size={18} />,
  deposit_confirmed: <Landmark size={18} />,
  dispute_opened: <Scale size={18} />,
  dispute_filed: <Scale size={18} />,
  dispute_created: <Scale size={18} />,
  dispute_resolved: <CheckCircle size={18} />,
  rating_received: <Star size={18} />,
  rating_visible: <Star size={18} />,
  new_message: <MessageCircle size={18} />,
  assignment_cancelled: <Ban size={18} />,
  refund_processed: <ArrowDownLeft size={18} />,
}
