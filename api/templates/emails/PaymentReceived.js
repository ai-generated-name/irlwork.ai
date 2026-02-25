const React = require('react');
const { Text, Section } = require('@react-email/components');
const Layout = require('./Layout');
const { BRAND, FRONTEND_URL } = require('./Layout');
const Button = require('./Button');
const e = React.createElement;

function PaymentReceived(props) {
  const { amount, title, walletBalance, unsubscribeUrl } = props;
  const walletUrl = `${FRONTEND_URL}/wallet`;

  return e(Layout, {
    previewText: amount ? `You've been paid $${amount}` : 'Payment received',
    unsubscribeUrl,
    eventType: 'payment',
  },
    e(Text, { style: headlineStyle }, "You've been paid!"),
    e(Section, { style: amountSection },
      e(Text, { style: amountStyle }, amount ? `$${amount}` : '$—')
    ),
    title
      ? e(Text, { style: detailText }, `For: "${title}"`)
      : null,
    walletBalance
      ? e(Text, { style: balanceText }, `Your wallet balance is now $${walletBalance}`)
      : null,
    e(Section, { style: ctaSection },
      e(Button, { href: walletUrl }, 'View Wallet')
    )
  );
}

const headlineStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: BRAND.textPrimary,
  margin: '0 0 16px 0',
};

const amountSection = {
  textAlign: 'center',
  padding: '16px 0',
};

const amountStyle = {
  fontSize: '36px',
  fontWeight: '700',
  color: BRAND.primary,
  margin: 0,
};

const detailText = {
  fontSize: '14px',
  color: BRAND.textSecondary,
  textAlign: 'center',
  margin: '0 0 8px 0',
};

const balanceText = {
  fontSize: '13px',
  color: BRAND.textTertiary,
  textAlign: 'center',
  margin: '0 0 16px 0',
};

const ctaSection = {
  textAlign: 'center',
  marginTop: '8px',
};

module.exports = PaymentReceived;
