/**
 * Notification Service
 *
 * Centralized notification management — in-app notifications,
 * email (via Resend), and webhook delivery.
 *
 * NOTE: This service is currently a reference implementation.
 * The actual notification functions are still inline in server.js.
 * During ARCH-1 extraction, server.js should import from here.
 *
 * Usage:
 *   const { createNotificationHelper, buildEmailHtml } = require('./services/notificationService');
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Build standardized email HTML body.
 * @param {object} options
 * @param {string} options.heading - Email heading text
 * @param {string} options.headingColor - Hex color for heading (e.g. '#059669')
 * @param {string} options.headingBg - Background color (e.g. '#D1FAE5')
 * @param {string} options.body - Body text
 * @param {string} options.ctaText - Button text
 * @param {string} options.ctaUrl - Button URL
 * @returns {string} HTML string
 */
function buildEmailHtml({ heading, headingColor, headingBg, body, ctaText, ctaUrl }) {
  return `
    <div style="background: ${headingBg}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p style="color: ${headingColor}; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">${heading}</p>
      <p style="color: #1A1A1A; font-size: 14px; margin: 0; line-height: 1.5;">${body}</p>
    </div>
    ${ctaText && ctaUrl ? `<a href="${ctaUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">${ctaText}</a>` : ''}
  `;
}

/**
 * Email templates for lifecycle events.
 */
const EMAIL_TEMPLATES = {
  task_assigned: (taskTitle, message, taskUrl) => ({
    subject: `You've been assigned to "${taskTitle}"`,
    html: buildEmailHtml({
      heading: "You've been assigned!",
      headingColor: '#059669',
      headingBg: '#D1FAE5',
      body: message,
      ctaText: 'View Task & Instructions',
      ctaUrl: taskUrl
    })
  }),

  task_approved: (taskTitle, budget, taskUrl) => ({
    subject: `Your work on "${taskTitle}" has been approved!`,
    html: buildEmailHtml({
      heading: 'Work Approved!',
      headingColor: '#059669',
      headingBg: '#D1FAE5',
      body: `Your work on "${taskTitle}" has been approved. $${budget} is being processed and will be available after the 48-hour clearing period.`,
      ctaText: 'View Task',
      ctaUrl: taskUrl
    })
  }),

  payment_available: (amount, taskUrl) => ({
    subject: `You've been paid $${amount}!`,
    html: buildEmailHtml({
      heading: 'Payment Available!',
      headingColor: '#059669',
      headingBg: '#D1FAE5',
      body: `$${amount} is now available for withdrawal. The 48-hour dispute window has passed.`,
      ctaText: 'View Payments',
      ctaUrl: taskUrl || 'https://www.irlwork.ai/payments'
    })
  }),

  dispute_opened: (taskTitle, reason, taskUrl) => ({
    subject: `Dispute opened on "${taskTitle}"`,
    html: buildEmailHtml({
      heading: 'Dispute Opened',
      headingColor: '#DC2626',
      headingBg: '#FEE2E2',
      body: `A dispute has been opened for task "${taskTitle}". Reason: ${reason}`,
      ctaText: 'View Task',
      ctaUrl: taskUrl
    })
  }),

  new_application: (applicantName, taskTitle, taskUrl) => ({
    subject: `New applicant for "${taskTitle}"`,
    html: buildEmailHtml({
      heading: 'New Application',
      headingColor: '#4338CA',
      headingBg: '#EEF2FF',
      body: `<strong>${applicantName}</strong> applied to your task "${taskTitle}".`,
      ctaText: 'Review Applicants',
      ctaUrl: taskUrl
    })
  })
};

module.exports = {
  buildEmailHtml,
  EMAIL_TEMPLATES
};
