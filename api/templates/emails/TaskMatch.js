const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const TaskCard = require('./TaskCard');
const e = React.createElement;

function TaskMatch(props) {
  const { title, budget, city, datetime, duration, skills, taskId, unsubscribeUrl } = props;
  const taskUrl = `${FRONTEND_URL}/tasks/${taskId}`;

  return e(Layout, {
    previewText: `New task match: ${title || 'New Task'}`,
    unsubscribeUrl,
    eventType: 'task match',
  },
    e(Text, { style: headlineStyle }, 'New task matches your skills'),
    e(TaskCard, { title, budget, city, datetime, duration }),
    skills && skills.length > 0
      ? e(Section, { style: skillsSection },
          e(Text, { style: skillsLabel }, 'Skills needed:'),
          e(Text, { style: skillsText }, skills.join(', '))
        )
      : null,
    e(Section, { style: ctaSection },
      e(Button, { href: taskUrl }, 'View Task')
    )
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 16px 0',
};

const skillsSection = {
  marginBottom: '16px',
};

const skillsLabel = {
  fontSize: '13px',
  color: BRAND.textTertiary,
  margin: '0 0 4px 0',
};

const skillsText = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  margin: 0,
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = TaskMatch;
