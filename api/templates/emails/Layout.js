const React = require('react');
const { Html, Head, Body, Container, Section, Text, Link, Hr, Img, Preview } = require('@react-email/components');
const e = React.createElement;

const BRAND = {
  primary: '#E07A5F',
  textPrimary: '#1A1A1A',
  textSecondary: '#525252',
  textTertiary: '#8A8A8A',
  textMuted: '#B0B0B0',
  bg: '#FAF8F5',
  bgWhite: '#FFFFFF',
  bgCard: '#F5F3F0',
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.irlwork.ai';

function Layout({ previewText, children, unsubscribeUrl, managePreferencesUrl, eventType }) {
  const preferencesLink = managePreferencesUrl || `${FRONTEND_URL}/settings/notifications`;

  return e(Html, null,
    e(Head, null),
    previewText ? e(Preview, null, previewText) : null,
    e(Body, { style: bodyStyle },
      e(Container, { style: containerStyle },
        // Header
        e(Section, { style: headerStyle },
          e(Text, { style: logoStyle },
            e(Link, { href: FRONTEND_URL, style: { color: BRAND.textPrimary, textDecoration: 'none' } },
              'IRL Work'
            )
          )
        ),

        // Content
        e(Section, { style: contentStyle },
          children
        ),

        // Footer
        e(Hr, { style: hrStyle }),
        e(Section, { style: footerStyle },
          e(Text, { style: footerTextStyle },
            eventType
              ? `You're receiving this because you have ${eventType} notifications enabled on IRL Work.`
              : 'You received this email from IRL Work.'
          ),
          e(Text, { style: footerLinksStyle },
            e(Link, { href: preferencesLink, style: footerLinkStyle }, 'Manage Preferences'),
            unsubscribeUrl ? ' | ' : null,
            unsubscribeUrl ? e(Link, { href: unsubscribeUrl, style: footerLinkStyle }, 'Unsubscribe') : null
          ),
          e(Text, { style: footerAddressStyle },
            'IRL Work Inc. | San Francisco, CA'
          )
        )
      )
    )
  );
}

const bodyStyle = {
  backgroundColor: '#F9F9F9',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const containerStyle = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '20px 0',
};

const headerStyle = {
  padding: '24px 24px 0 24px',
};

const logoStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: BRAND.textPrimary,
  margin: 0,
};

const contentStyle = {
  padding: '24px',
};

const hrStyle = {
  borderColor: '#E8E8E8',
  margin: '0 24px',
};

const footerStyle = {
  padding: '16px 24px 24px 24px',
};

const footerTextStyle = {
  fontSize: '12px',
  color: BRAND.textMuted,
  lineHeight: '18px',
  margin: '0 0 8px 0',
};

const footerLinksStyle = {
  fontSize: '12px',
  margin: '0 0 8px 0',
};

const footerLinkStyle = {
  color: BRAND.textTertiary,
  textDecoration: 'underline',
};

const footerAddressStyle = {
  fontSize: '11px',
  color: BRAND.textMuted,
  margin: 0,
};

module.exports = Layout;
module.exports.BRAND = BRAND;
module.exports.FRONTEND_URL = FRONTEND_URL;
