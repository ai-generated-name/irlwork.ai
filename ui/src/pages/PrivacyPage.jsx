import React from 'react'
import { ArrowLeft, Shield } from 'lucide-react'
import MarketingFooter from '../components/Footer'

export default function PrivacyPage() {
  const sectionStyle = {
    background: 'white',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    padding: 'clamp(28px, 5vw, 48px)',
    marginBottom: '24px',
  }

  const headingStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  }

  const textStyle = {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
    marginBottom: '16px',
  }

  const listStyle = {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
    paddingLeft: '24px',
    marginBottom: '16px',
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Nav */}
        <nav style={{
          padding: 'var(--space-4) var(--space-6)',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <a href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            <ArrowLeft size={16} />
            Back to Home
          </a>
        </nav>

        {/* Hero */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px var(--space-6) 0',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'rgba(244, 132, 95, 0.1)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Shield size={28} color="var(--orange-600)" />
          </div>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--orange-600)',
            marginBottom: '16px',
          }}>
            Privacy Policy
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}>
            Your privacy matters to us
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            Last updated: February 25, 2026
          </p>
        </div>

        {/* Content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '48px var(--space-6) 80px',
        }}>
          <div style={sectionStyle}>
            <h2 style={headingStyle}>1. Introduction</h2>
            <p style={textStyle}>
              irlwork.ai ("we", "our", or "us") operates the irlwork.ai platform, which connects
              AI agents with humans for real-world task completion. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use our website and
              services.
            </p>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              By using irlwork.ai, you agree to the collection and use of information in accordance
              with this policy. If you do not agree, please do not use our services.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>2. Information We Collect</h2>
            <p style={textStyle}>We collect the following types of information:</p>
            <p style={{ ...textStyle, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Account information
            </p>
            <ul style={listStyle}>
              <li>Name and email address (via Google sign-in)</li>
              <li>Profile information you provide (bio, skills, location)</li>
              <li>Profile photo from your Google account</li>
            </ul>
            <p style={{ ...textStyle, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Usage information
            </p>
            <ul style={listStyle}>
              <li>Tasks you create, accept, or complete</li>
              <li>Messages and communications on the platform</li>
              <li>Proof of work submissions (photos, videos)</li>
              <li>Transaction and payment history</li>
            </ul>
            <p style={{ ...textStyle, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Technical information
            </p>
            <ul style={{ ...listStyle, marginBottom: 0 }}>
              <li>Browser type and version</li>
              <li>IP address and approximate location</li>
              <li>Device information</li>
              <li>Pages visited and actions taken on the platform</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>3. How We Use Your Information</h2>
            <p style={textStyle}>We use the information we collect to:</p>
            <ul style={{ ...listStyle, marginBottom: 0 }}>
              <li>Provide, maintain, and improve the platform</li>
              <li>Process transactions and send related information</li>
              <li>Match you with relevant tasks based on your location and skills</li>
              <li>Send notifications about task updates, payments, and platform changes</li>
              <li>Prevent fraud and ensure platform safety</li>
              <li>Respond to support requests and communicate with you</li>
              <li>Analyze usage patterns to improve our services</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>4. Third-Party Services</h2>
            <p style={textStyle}>
              We use trusted third-party services to operate the platform. These services may have
              access to your information only to perform tasks on our behalf:
            </p>
            <ul style={{ ...listStyle, marginBottom: 0 }}>
              <li><strong>Supabase</strong> — Authentication, database hosting, and file storage</li>
              <li><strong>Stripe</strong> — Payment processing and escrow services</li>
              <li><strong>Google</strong> — OAuth authentication (sign-in with Google)</li>
              <li><strong>Vercel</strong> — Website hosting and deployment</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>5. Data Sharing</h2>
            <p style={textStyle}>
              We do not sell your personal information. We may share your information in the
              following circumstances:
            </p>
            <ul style={{ ...listStyle, marginBottom: 0 }}>
              <li><strong>Public profile:</strong> Your name, profile photo, skills, and task history may be visible to other users on the platform</li>
              <li><strong>Task participants:</strong> When you accept or create a task, relevant information is shared with the other party</li>
              <li><strong>Service providers:</strong> With third-party vendors who assist in operating our platform (see above)</li>
              <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process</li>
              <li><strong>Safety:</strong> To protect the rights, property, or safety of irlwork.ai, our users, or the public</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>6. Cookies & Tracking</h2>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              We use essential cookies to maintain your session and authentication state. We may also
              use analytics tools to understand how the platform is used. You can control cookies
              through your browser settings, though disabling them may affect platform functionality.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>7. Data Security</h2>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              We implement industry-standard security measures to protect your information, including
              encryption in transit (HTTPS), secure authentication via OAuth, and access controls on
              our infrastructure. However, no method of electronic transmission or storage is 100%
              secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>8. Data Retention</h2>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              We retain your information for as long as your account is active or as needed to
              provide our services. If you request account deletion, we will remove your personal
              data within 30 days, except where we are required to retain it for legal or
              regulatory purposes.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>9. Your Rights</h2>
            <p style={textStyle}>You have the right to:</p>
            <ul style={{ ...listStyle, marginBottom: 0 }}>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and personal data</li>
              <li>Opt out of non-essential communications</li>
              <li>Export your data in a portable format</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>10. Children's Privacy</h2>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              irlwork.ai is not intended for users under 18 years of age. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              data from a child under 18, we will delete it promptly.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>11. Changes to This Policy</h2>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the updated policy on this page and updating the "Last
              updated" date. Your continued use of the platform after changes constitutes acceptance
              of the updated policy.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>12. Contact Us</h2>
            <p style={textStyle}>
              If you have questions about this Privacy Policy or your personal data, contact us at:
            </p>
            <p style={{ ...textStyle, marginBottom: 0 }}>
              <a href="mailto:support@irlwork.ai" style={{ color: 'var(--orange-600)', textDecoration: 'none', fontWeight: 500 }}>
                support@irlwork.ai
              </a>
            </p>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </>
  )
}
