const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const e = React.createElement;

function DisputeOpened(props) {
  const { title, reason, taskId, unsubscribeUrl } = props;
  const disputeUrl = `${FRONTEND_URL}/tasks/${taskId}`;

  return e(Layout, {
    previewText: `Dispute opened: ${title || 'a task'}`,
    unsubscribeUrl,
    eventType: 'dispute',
  },
    e(Text, { style: headlineStyle }, 'A dispute has been opened'),
    title
      ? e(Text, { style: detailText }, `Task: "${title}"`)
      : null,
    reason
      ? e(Text, { style: reasonText }, reason)
      : null,
    e(Section, { style: noteStyle },
      e(Text, { style: noteText },
        'Payment is on hold until this is resolved. Our team will review the details.'
      )
    ),
    e(Section, { style: ctaSection },
      e(Button, { href: disputeUrl }, 'View Dispute')
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
  margin: '0 0 8px 0',
};

const reasonText = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  fontStyle: 'italic',
  margin: '0 0 12px 0',
};

const noteStyle = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '16px',
};

const noteText = {
  fontSize: '13px',
  color: '#7F1D1D',
  lineHeight: '20px',
  margin: 0,
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = DisputeOpened;
