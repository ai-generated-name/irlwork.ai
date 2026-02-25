const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const e = React.createElement;

/**
 * NewMessage template — supports both single messages and batched digests.
 *
 * Single message props: { senderName, messagePreview, taskTitle, conversationId }
 * Batched digest props: { messages: [{ senderName, preview, timestamp }], totalCount }
 */
function NewMessage(props) {
  const { senderName, messagePreview, taskTitle, conversationId, taskId, messages, totalCount, unsubscribeUrl } = props;

  // Batched digest mode
  if (messages && messages.length > 0) {
    return renderBatched({ messages, totalCount, unsubscribeUrl });
  }

  // Single message mode
  const messagesUrl = conversationId
    ? `${FRONTEND_URL}/messages/${conversationId}`
    : `${FRONTEND_URL}/tasks/${taskId}`;

  return e(Layout, {
    previewText: `${senderName || 'Someone'}: ${(messagePreview || '').slice(0, 60)}`,
    unsubscribeUrl,
    eventType: 'message',
  },
    e(Text, { style: headlineStyle }, `New message from ${senderName || 'someone'}`),
    taskTitle
      ? e(Text, { style: taskRef }, `Task: ${taskTitle}`)
      : null,
    e(Section, { style: messageCard },
      e(Text, { style: senderStyle }, senderName || 'Unknown'),
      e(Text, { style: previewStyle }, messagePreview || '')
    ),
    e(Section, { style: ctaSection },
      e(Button, { href: messagesUrl }, 'Reply on IRL Work')
    )
  );
}

function renderBatched({ messages, totalCount, unsubscribeUrl }) {
  const shown = messages.slice(0, 5);
  const remaining = (totalCount || messages.length) - shown.length;
  const messagesUrl = `${FRONTEND_URL}/messages`;

  return e(Layout, {
    previewText: `You have ${totalCount || messages.length} new messages`,
    unsubscribeUrl,
    eventType: 'message',
  },
    e(Text, { style: headlineStyle }, `You have ${totalCount || messages.length} new messages`),
    ...shown.map((msg, i) =>
      e(Section, { key: i, style: messageCard },
        e(Text, { style: senderStyle }, msg.senderName || 'Unknown'),
        e(Text, { style: previewStyle }, (msg.preview || '').slice(0, 100)),
        msg.timestamp
          ? e(Text, { style: timestampStyle }, msg.timestamp)
          : null
      )
    ),
    remaining > 0
      ? e(Text, { style: moreText }, `...and ${remaining} more messages`)
      : null,
    e(Section, { style: ctaSection },
      e(Button, { href: messagesUrl }, 'Open Messages')
    )
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 16px 0',
};

const taskRef = {
  fontSize: '13px',
  color: BRAND.textTertiary,
  margin: '0 0 12px 0',
};

const messageCard = {
  backgroundColor: '#F5F3F0',
  borderRadius: '12px',
  padding: '16px 20px',
  marginBottom: '12px',
};

const senderStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 4px 0',
};

const previewStyle = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  lineHeight: '20px',
  margin: 0,
};

const timestampStyle = {
  fontSize: '12px',
  color: BRAND.textTertiary,
  margin: '4px 0 0 0',
};

const moreText = {
  fontSize: '13px',
  color: BRAND.textTertiary,
  fontStyle: 'italic',
  margin: '0 0 12px 0',
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = NewMessage;
