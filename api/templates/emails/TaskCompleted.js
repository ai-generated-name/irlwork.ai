const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const TaskCard = require('./TaskCard');
const e = React.createElement;

function TaskCompleted(props) {
  const { title, budget, city, workerName, taskId, reviewWindowHours, autoReleaseDate, unsubscribeUrl, notificationType } = props;
  const taskUrl = `${FRONTEND_URL}/tasks/${taskId}`;
  const reviewUrl = `${FRONTEND_URL}/tasks/${taskId}`;

  const isApproval = notificationType === 'proof_approved';
  const headline = isApproval ? 'Your work has been approved' : 'Task completed — review required';
  const previewText = isApproval
    ? `Work approved: ${title || 'Your Task'}`
    : `Task completed: ${title || 'Your Task'}`;

  return e(Layout, {
    previewText,
    unsubscribeUrl,
    eventType: 'task',
  },
    e(Text, { style: headlineStyle }, headline),
    e(TaskCard, { title, budget, city, status: 'Completed' }),
    workerName
      ? e(Text, { style: detailText }, `Completed by: ${workerName}`)
      : null,
    !isApproval && reviewWindowHours
      ? e(Section, { style: calloutStyle },
          e(Text, { style: calloutText },
            `You have ${reviewWindowHours} hours to review this task. After that, payment of $${budget || '—'} will be automatically released.`
          ),
          autoReleaseDate
            ? e(Text, { style: calloutSmall }, `Auto-release: ${autoReleaseDate}`)
            : null
        )
      : null,
    e(Section, { style: ctaSection },
      isApproval
        ? e(Button, { href: taskUrl }, 'View Task')
        : e(Button, { href: reviewUrl }, 'Review Now')
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

const calloutStyle = {
  backgroundColor: '#FFF7ED',
  borderLeft: `4px solid ${BRAND.primary}`,
  borderRadius: '4px',
  padding: '12px 16px',
  marginBottom: '16px',
};

const calloutText = {
  fontSize: '14px',
  color: BRAND.textPrimary,
  lineHeight: '20px',
  margin: 0,
};

const calloutSmall = {
  fontSize: '12px',
  color: BRAND.textTertiary,
  margin: '8px 0 0 0',
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = TaskCompleted;
