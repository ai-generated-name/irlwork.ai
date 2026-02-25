const React = require('react');
const { Button: EmailButton } = require('@react-email/components');
const { BRAND } = require('./Layout');
const e = React.createElement;

function Button({ href, children, variant = 'primary' }) {
  const style = variant === 'secondary' ? secondaryStyle : primaryStyle;
  return e(EmailButton, { href, style }, children);
}

const primaryStyle = {
  backgroundColor: BRAND.primary,
  color: '#FFFFFF',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '14px',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
};

const secondaryStyle = {
  backgroundColor: 'transparent',
  color: BRAND.primary,
  padding: '10px 24px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '14px',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  border: `2px solid ${BRAND.primary}`,
};

module.exports = Button;
