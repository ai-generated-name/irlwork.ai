const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const e = React.createElement;

function Generic(props) {
  const { title, message, actionUrl, unsubscribeUrl, eventType } = props;
  const url = actionUrl
    ? (actionUrl.startsWith('http') ? actionUrl : `${FRONTEND_URL}${actionUrl}`)
    : null;

  return e(Layout, {
    previewText: title || 'New notification from IRL Work',
    unsubscribeUrl,
    eventType: eventType || 'notification',
  },
    e(Text, { style: headlineStyle }, title || 'Notification'),
    message
      ? e(Text, { style: bodyStyle }, message)
      : null,
    url
      ? e(Section, { style: ctaSection },
          e(Button, { href: url }, 'View Details')
        )
      : null
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 16px 0',
};

const bodyStyle = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  lineHeight: '22px',
  margin: '0 0 16px 0',
};

const ctaSection = {
  marginTop: '8px',
};

module.exports = Generic;
