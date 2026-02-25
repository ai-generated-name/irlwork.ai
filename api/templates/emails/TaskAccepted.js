const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const TaskCard = require('./TaskCard');
const e = React.createElement;

function TaskAccepted(props) {
  const { title, budget, city, datetime, workerName, taskId, unsubscribeUrl, notificationType } = props;
  const taskUrl = `${FRONTEND_URL}/tasks/${taskId}`;

  // Different headlines based on the specific notification type
  let headline = 'Your task has been accepted';
  let previewText = `Task accepted: ${title || 'Your Task'}`;
  if (notificationType === 'task_assigned') {
    headline = `You've been assigned to a task`;
    previewText = `You've been assigned: ${title || 'New Task'}`;
  } else if (notificationType === 'task_offered') {
    headline = 'You have a new task offer';
    previewText = `New task offer: ${title || 'New Task'}`;
  }

  return e(Layout, {
    previewText,
    unsubscribeUrl,
    eventType: 'task',
  },
    e(Text, { style: headlineStyle }, headline),
    e(TaskCard, { title, budget, city, datetime }),
    workerName
      ? e(Text, { style: detailText }, `Worker: ${workerName}`)
      : null,
    e(Section, { style: ctaSection },
      e(Button, { href: taskUrl }, 'View Task Details')
    )
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 16px 0',
};

const detailText = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  margin: '0 0 16px 0',
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = TaskAccepted;
