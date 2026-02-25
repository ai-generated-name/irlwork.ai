const React = require('react');
const { Section, Text } = require('@react-email/components');
const { BRAND } = require('./Layout');
const e = React.createElement;

function TaskCard({ title, budget, city, status, datetime, duration }) {
  return e(Section, { style: cardStyle },
    e(Text, { style: titleStyle }, title || 'Task'),
    e(Section, { style: detailsStyle },
      budget ? e(Text, { style: badgeStyle }, `$${budget}`) : null,
      city ? e(Text, { style: detailStyle }, city) : null,
      datetime ? e(Text, { style: detailStyle }, datetime) : null,
      duration ? e(Text, { style: detailStyle }, `${duration}h`) : null,
      status ? e(Text, { style: statusStyle }, status) : null
    )
  );
}

const cardStyle = {
  backgroundColor: '#F5F3F0',
  borderRadius: '12px',
  padding: '16px 20px',
  marginBottom: '16px',
};

const titleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 8px 0',
};

const detailsStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const badgeStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: BRAND.primary,
  margin: '0 12px 0 0',
  display: 'inline',
};

const detailStyle = {
  fontSize: '13px',
  color: BRAND.textSecondary,
  margin: '0 12px 0 0',
  display: 'inline',
};

const statusStyle = {
  fontSize: '12px',
  color: BRAND.textTertiary,
  margin: '0',
  display: 'inline',
};

module.exports = TaskCard;
