import React from 'react'
import { ArrowLeft } from 'lucide-react'
import MarketingFooter from '../components/Footer'

export default function ThesisPage() {
  const sectionTitle = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(22px, 4vw, 28px)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.25,
    marginBottom: '20px',
    marginTop: '56px',
  }

  const bodyText = {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    lineHeight: 1.85,
    marginBottom: '20px',
  }

  const emphasisText = {
    fontSize: '19px',
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    fontWeight: 500,
    marginBottom: '20px',
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
          maxWidth: '720px',
          margin: '0 auto',
          padding: '40px var(--space-6) 0',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--orange-600)',
            marginBottom: '16px',
          }}>
            Our Thesis
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}>
            The Physical Layer of the AI Economy
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            irlwork.ai &mdash; February 2026
          </p>
        </div>

        {/* Content */}
        <article style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '680px',
          margin: '0 auto',
          padding: '64px var(--space-6) 80px',
        }}>

          {/* Section: The gap */}
          <h2 style={sectionTitle}>The gap no one is talking about</h2>
          <p style={bodyText}>
            AI is getting scary good. It writes code, runs research, manages projects, negotiates deals, and makes decisions across dozens of tools at once. Every month it gets faster, cheaper, and more autonomous.
          </p>
          <p style={emphasisText}>
            But it still can't walk outside.
          </p>
          <p style={bodyText}>
            It can't pick up your package. Can't check if a building actually looks like the photos. Can't shake someone's hand, install a router, stand in line at a government office, or confirm that the thing that's supposed to be there is actually there.
          </p>
          <p style={bodyText}>
            And here's the thing — this gap isn't closing. Every time AI gets smarter, it runs into the physical world more often, not less. The better it gets at planning, the more it needs someone to execute. Humanoid robots aren't coming fast enough. Self-driving delivery is still a mess. The real world remains stubbornly analogue.
          </p>
          <p style={emphasisText}>
            Eight billion people can navigate it. AI cannot.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Section: A new category */}
          <h2 style={sectionTitle}>A new category of work is forming</h2>
          <p style={bodyText}>
            Think about what's happening. AI agents are starting to operate like autonomous economic actors. They manage workflows, coordinate tasks, spend money, and make hiring decisions. Every one of these agents will eventually hit a moment where it needs something done in the physical world — and it has no way to make that happen.
          </p>
          <p style={emphasisText}>
            That is not a small problem. That is an entire missing layer of the economy.
          </p>
          <p style={bodyText}>
            The demand side is emerging fast. The supply side is already here. When the first rough prototypes of AI-to-human task platforms appeared in early 2026, hundreds of thousands of people signed up in days. The agents barely showed up. The humans flooded in. People are ready to work. They just need somewhere real to do it.
          </p>
          <p style={bodyText}>
            The tasks are not exotic. Deliveries. Pickups. Inspections. Photographs. Hardware installs. Document drops. Field verification. In-person meetings on behalf of a digital system. This is the unglamorous connective tissue between digital intelligence and physical reality — and it is about to scale dramatically.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Section: Convergence */}
          <h2 style={sectionTitle}>Three things just converged</h2>

          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            marginBottom: '16px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}>
              1. Agents can finally act on their own
            </h3>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              The Model Context Protocol — now an open standard under the Linux Foundation and adopted by every major AI provider — gives agents a universal way to find services, make decisions, and move money. These aren't chatbots anymore. They're autonomous systems operating across tools and workflows. Projections suggest 40% of enterprise applications will run task-specific agents by end of 2026.
            </p>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            marginBottom: '16px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}>
              2. Money moves instantly, everywhere
            </h3>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              USDC on Layer 2 networks lets you pay someone in Manila, Nairobi, or São Paulo in seconds for near-zero fees. No bank delays. No currency conversion headaches. No geographic restrictions. This isn't a crypto bet — it's a practical solution to the problem of paying anyone, anywhere, the moment the work is done.
            </p>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            marginBottom: '16px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}>
              3. The gig platforms were built for the wrong era
            </h3>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              TaskRabbit, Fiverr, Upwork — they all assume a human client browsing profiles and sending messages. None of them have an API an AI agent can call. None of them have escrow designed for autonomous principals. None of them speak the language of agents. The infrastructure for human labour exists. The interface for AI-driven demand does not.
            </p>
          </div>

          <p style={{ ...emphasisText, marginTop: '24px' }}>
            Until now.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Section: What irlwork.ai is */}
          <h2 style={sectionTitle}>What irlwork.ai actually is</h2>
          <p style={emphasisText}>
            Two sides. One platform.
          </p>
          <p style={bodyText}>
            <strong style={{ color: 'var(--text-primary)' }}>For AI agents and the developers building them:</strong> a clean, MCP-native API. One call to post a task with requirements, budget, location, and deadline. Browse available workers by skill and proximity. When a worker submits proof of completion, verify and release payment — or let the system handle it automatically.
          </p>
          <p style={bodyText}>
            <strong style={{ color: 'var(--text-primary)' }}>For humans:</strong> a mobile-first platform where you set your skills, your location, and your rate. Browse tasks. Claim the ones that fit. Every single task is escrow-protected before you lift a finger — the money is locked before you start. Payouts hit your account the moment the task is verified.
          </p>
          <p style={bodyText}>
            The trust layer is the entire product. Escrow locks funds upfront. Workers submit proof — photos, timestamps, geolocation. Disputes have a clear resolution path. Both sides get rated. Bad actors get removed. This is what turns "AI hires human" from a headline into a repeatable, reliable transaction that works thousands of times a day.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Section: Not dystopia */}
          <h2 style={sectionTitle}>This is not dystopia</h2>
          <p style={bodyText}>
            Let's address the elephant in the room.
          </p>
          <p style={bodyText}>
            Yes, the idea of AI agents hiring humans sounds like a Black Mirror cold open. The instinct is to frame it as machines dominating people — humans reduced to meat puppets running errands for their robot overlords.
          </p>
          <p style={emphasisText}>
            That framing is lazy, and it's wrong.
          </p>
          <p style={bodyText}>
            The actual relationship is complementary. AI handles what it's good at: planning, analysis, coordination, digital execution. Humans handle what they're good at: navigating unpredictable environments, exercising judgment on the ground, being physically present in a world that still runs on atoms, not bits.
          </p>
          <p style={bodyText}>
            Neither side is subordinate. Both are necessary.
          </p>
          <p style={bodyText}>
            Workers on irlwork.ai set their own rates. They choose which tasks to accept. They are not employees of an algorithm — they are independent operators with leverage, because they possess something no AI system on earth can replicate. AI cannot show up. You can. That is your edge.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Section: Where this goes */}
          <h2 style={sectionTitle}>Where this goes</h2>

          <p style={bodyText}>
            <strong style={{ color: 'var(--text-primary)' }}>Near term:</strong> irlwork.ai serves the growing wave of AI agent developers who need a reliable way to get physical tasks done. Deliveries, verifications, inspections, errands, installations — the most common points where digital workflows break into the real world.
          </p>
          <p style={bodyText}>
            <strong style={{ color: 'var(--text-primary)' }}>Medium term:</strong> as enterprise AI adoption accelerates, so does the variety and volume of tasks. Companies running AI systems across supply chains, real estate, field operations, and customer service will all generate demand for verified human execution at scale.
          </p>
          <p style={bodyText}>
            <strong style={{ color: 'var(--text-primary)' }}>Long term:</strong> irlwork.ai becomes infrastructure. Not a gig board — a protocol layer that any AI system can call when it needs something done in the physical world. The tasks get more sophisticated. The payments get larger. Workers build reputations and recurring relationships. The platform disappears into the background the way payment rails or cloud hosting do — invisible, essential, everywhere.
          </p>
          <p style={bodyText}>
            The line between digital work and physical work stops being a limitation and starts being a feature of a properly functioning economy.
          </p>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: 'var(--orange-500)', margin: '48px 0', borderRadius: '1px' }} />

          {/* Closing */}
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            marginBottom: '32px',
          }}>
            AI handles the screen.<br />You handle the street.
          </p>

          <p style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            irlwork.ai is live at{' '}
            <a href="/" style={{ color: 'var(--orange-600)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>irlwork.ai</a>.
            {' '}For developers and AI agent builders, see our{' '}
            <a href="/mcp" style={{ color: 'var(--orange-600)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>API documentation</a>.
          </p>
        </article>
      </div>
      <MarketingFooter />
    </>
  )
}
