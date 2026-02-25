const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const e = React.createElement;

function ReviewReminder(props) {
  const { title, budget, hoursRemaining, taskId, unsubscribeUrl } = props;
  const reviewUrl = `${FRONTEND_URL}/tasks/${taskId}`;

  return e(Layout, {
    previewText: `Reminder: Review "${title || 'a task'}"`,
    unsubscribeUrl,
    eventType: 'review',
  },
    e(Text, { style: headlineStyle }, `Reminder: Review "${title || 'a task'}"`),
    e(Section, { style: calloutStyle },
      e(Text, { style: calloutText },
        hoursRemaining
          ? `Payment of $${budget || '—'} will auto-release in ${hoursRemaining} hours`
          : `Payment of $${budget || '—'} will auto-release soon`
      )
    ),
    e(Section, { style: ctaSection },
      e(Button, { href: reviewUrl }, 'Review Now')
    )
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
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
  fontWeight: '500',
  color: BRAND.textPrimary,
  lineHeight: '20px',
  margin: 0,
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = ReviewReminder;
