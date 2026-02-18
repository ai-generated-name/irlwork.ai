import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bot } from 'lucide-react'
import MarketingFooter from '../components/Footer'

/* ─── Animated floating orb (pure CSS) ─── */
function GradientOrb({ size = 400, top, left, right, bottom, color1, color2, delay = 0, duration = 20 }) {
  return (
    <div style={{
      position: 'absolute',
      width: size,
      height: size,
      top, left, right, bottom,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color1} 0%, ${color2} 50%, transparent 70%)`,
      filter: 'blur(80px)',
      opacity: 0.4,
      animation: `orbFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
      pointerEvents: 'none',
    }} />
  )
}

/* ─── Scroll-reveal wrapper ─── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el) } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}s, transform 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Animated counter ─── */
function Counter({ value, suffix = '' }) {
  const ref = useRef(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) { setStarted(true); observer.unobserve(el) } },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let frame
    const start = performance.now()
    const dur = 1800
    const step = (now) => {
      const progress = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * value))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [started, value])

  return <span ref={ref}>{count}{suffix}</span>
}

/* ─── Particle field (canvas) ─── */
function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    const count = 60

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W()
        if (p.x > W()) p.x = 0
        if (p.y < 0) p.y = H()
        if (p.y > H()) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(244, 132, 95, ${p.alpha * 0.7})`
        ctx.fill()
      })
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(244, 132, 95, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

/* ─── Horizontal glow line ─── */
function GlowLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '64px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(244,132,95,0.3), transparent)' }} />
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'var(--orange-500)',
        boxShadow: '0 0 10px rgba(244,132,95,0.4)',
      }} />
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(244,132,95,0.3), transparent)' }} />
    </div>
  )
}

/* ─── SVG icon graphics ─── */
function BridgeGraphic() {
  return (
    <svg viewBox="0 0 400 120" fill="none" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}>
      {/* Left node — AI */}
      <circle cx="60" cy="60" r="28" fill="rgba(244,132,95,0.1)" stroke="rgba(244,132,95,0.5)" strokeWidth="1.5">
        <animate attributeName="r" values="28;31;28" dur="3s" repeatCount="indefinite" />
      </circle>
      <text x="60" y="56" textAnchor="middle" fill="rgba(244,132,95,0.9)" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">AI</text>
      <text x="60" y="70" textAnchor="middle" fill="rgba(26,26,26,0.4)" fontSize="8" fontFamily="DM Sans, sans-serif">DIGITAL</text>
      {/* Right node — Human */}
      <circle cx="340" cy="60" r="28" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.5)" strokeWidth="1.5">
        <animate attributeName="r" values="28;31;28" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </circle>
      <text x="340" y="56" textAnchor="middle" fill="rgba(251,191,36,0.9)" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">IRL</text>
      <text x="340" y="70" textAnchor="middle" fill="rgba(26,26,26,0.4)" fontSize="8" fontFamily="DM Sans, sans-serif">PHYSICAL</text>
      {/* Bridge */}
      <line x1="95" y1="60" x2="305" y2="60" stroke="url(#bridgeGrad)" strokeWidth="1" strokeDasharray="6 4">
        <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
      </line>
      {/* Moving dot */}
      <circle r="3" fill="var(--orange-500)">
        <animate attributeName="cx" values="100;300;100" dur="4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="60;60;60" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Center label */}
      <rect x="160" y="42" width="80" height="24" rx="12" fill="rgba(244,132,95,0.15)" stroke="rgba(244,132,95,0.3)" strokeWidth="0.5" />
      <text x="200" y="58" textAnchor="middle" fill="rgba(244,132,95,0.9)" fontSize="8" fontFamily="JetBrains Mono, monospace">irlwork.ai</text>
      <defs>
        <linearGradient id="bridgeGrad" x1="95" y1="0" x2="305" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(244,132,95,0.6)" />
          <stop offset="50%" stopColor="rgba(251,191,36,0.6)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0.6)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function ConvergenceGraphic() {
  return (
    <svg viewBox="0 0 320 200" fill="none" style={{ width: '100%', maxWidth: '320px', margin: '0 auto 32px', display: 'block' }}>
      {/* Three input streams */}
      <path d="M40 30 Q160 30 160 100" stroke="rgba(244,132,95,0.4)" strokeWidth="1.5" fill="none">
        <animate attributeName="stroke-dashoffset" values="200;0" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M40 100 L160 100" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" fill="none">
        <animate attributeName="stroke-dashoffset" values="200;0" dur="3s" begin="0.3s" repeatCount="indefinite" />
      </path>
      <path d="M40 170 Q160 170 160 100" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" fill="none">
        <animate attributeName="stroke-dashoffset" values="200;0" dur="3s" begin="0.6s" repeatCount="indefinite" />
      </path>
      {/* Labels */}
      <text x="20" y="34" fill="rgba(244,132,95,0.8)" fontSize="9" fontFamily="JetBrains Mono, monospace">AGENTS</text>
      <text x="20" y="104" fill="rgba(251,191,36,0.8)" fontSize="9" fontFamily="JetBrains Mono, monospace">PAYMENTS</text>
      <text x="20" y="174" fill="rgba(16,185,129,0.8)" fontSize="9" fontFamily="JetBrains Mono, monospace">GAP</text>
      {/* Center convergence */}
      <circle cx="160" cy="100" r="20" fill="rgba(244,132,95,0.1)" stroke="rgba(244,132,95,0.5)" strokeWidth="1">
        <animate attributeName="r" values="20;24;20" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Output */}
      <path d="M180 100 L280 100" stroke="rgba(244,132,95,0.5)" strokeWidth="2" fill="none" />
      <polygon points="285,100 275,94 275,106" fill="rgba(244,132,95,0.7)" />
      <text x="240" y="90" fill="rgba(26,26,26,0.45)" fontSize="8" fontFamily="JetBrains Mono, monospace">OPPORTUNITY</text>
    </svg>
  )
}

/* ─── Timeline node for "Where this goes" ─── */
function TimelineItem({ label, color, children, isLast = false }) {
  return (
    <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: color, boxShadow: `0 0 12px ${color}`,
        }} />
        {!isLast && <div style={{ width: '1px', flex: 1, background: `linear-gradient(${color}, transparent)`, minHeight: '60px' }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : '40px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color,
          display: 'block',
          marginBottom: '8px',
        }}>{label}</span>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          margin: 0,
        }}>{children}</p>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════
   THESIS PAGE
   ═══════════════════════════════════════ */
export default function ThesisPage() {

  /* ─── Keyframe injection ─── */
  useEffect(() => {
    const id = 'thesis-keyframes'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes orbFloat {
        0% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -20px) scale(1.05); }
        66% { transform: translate(-20px, 15px) scale(0.95); }
        100% { transform: translate(10px, -10px) scale(1.02); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(244,132,95,0.08); }
        50% { box-shadow: 0 0 40px rgba(244,132,95,0.18); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes gridPulse {
        0%, 100% { opacity: 0.03; }
        50% { opacity: 0.06; }
      }
      .thesis-card {
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1), border-color 0.3s ease;
      }
      .thesis-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(244,132,95,0.12);
        border-color: rgba(244,132,95,0.35) !important;
      }
      .thesis-stat-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .thesis-stat-card:hover {
        transform: scale(1.03);
        box-shadow: 0 8px 32px rgba(244,132,95,0.2);
      }
    `
    document.head.appendChild(style)
    return () => { const el = document.getElementById(id); if (el) el.remove() }
  }, [])

  const sectionTitle = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(26px, 4.5vw, 36px)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    marginBottom: '24px',
  }

  const bodyText = {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    lineHeight: 1.9,
    marginBottom: '24px',
  }

  const emphasisText = {
    fontSize: '21px',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    fontWeight: 600,
    marginBottom: '24px',
    fontFamily: 'var(--font-display)',
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* ─── Animated grid background ─── */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'gridPulse 8s ease-in-out infinite',
        }} />

        {/* ─── Floating orbs ─── */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <GradientOrb size={600} top="-200px" right="-150px" color1="rgba(244,132,95,0.15)" color2="rgba(244,132,95,0)" delay={0} duration={25} />
          <GradientOrb size={500} top="40%" left="-200px" color1="rgba(251,191,36,0.1)" color2="rgba(251,191,36,0)" delay={3} duration={20} />
          <GradientOrb size={400} bottom="-100px" right="20%" color1="rgba(16,185,129,0.08)" color2="rgba(16,185,129,0)" delay={6} duration={22} />
        </div>

        {/* ─── Nav ─── */}
        <nav style={{
          padding: '20px var(--space-6)',
          position: 'relative',
          zIndex: 20,
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <a href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={16} />
            Back to Home
          </a>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.05em',
          }}>
            FEB 2026
          </div>
        </nav>


        {/* ═══════════════════════════════════════
            HERO SECTION
           ═══════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '80px var(--space-6) 0',
          textAlign: 'center',
        }}>
          <ParticleField />

          <Reveal>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '100px',
              background: 'rgba(244,132,95,0.1)',
              border: '1px solid rgba(244,132,95,0.2)',
              marginBottom: '32px',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'var(--orange-500)',
                boxShadow: '0 0 8px rgba(244,132,95,0.6)',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--orange-700)',
              }}>Our Thesis</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: '28px',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--orange-600) 50%, var(--orange-400) 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 6s linear infinite',
            }}>
              The Physical Layer<br />of the AI Economy
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{
              fontSize: '18px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: '540px',
              margin: '0 auto 48px',
            }}>
              AI keeps getting smarter. But the physical world hasn't changed. That gap is the biggest opportunity of the decade.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <BridgeGraphic />
          </Reveal>
        </div>


        {/* ═══════════════════════════════════════
            MAIN ARTICLE CONTENT
           ═══════════════════════════════════════ */}
        <article style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '100px var(--space-6) 0',
        }}>

          {/* ─── Section: The gap ─── */}
          <Reveal>
            <h2 style={sectionTitle}>The gap no one is talking about</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p style={bodyText}>
              AI is getting scary good. It writes code, runs research, manages projects, negotiates deals, and makes decisions across dozens of tools at once. Every month it gets faster, cheaper, and more autonomous.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{
              ...emphasisText,
              fontSize: '28px',
              background: 'linear-gradient(90deg, var(--orange-700), var(--orange-500))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              But it still can't walk outside.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              It can't pick up your package. Can't check if a building actually looks like the photos. Can't shake someone's hand, install a router, stand in line at a government office, or confirm that the thing that's supposed to be there is actually there.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              And here's the thing — this gap isn't closing. Every time AI gets smarter, it runs into the physical world more often, not less. The better it gets at planning, the more it needs someone to execute. Humanoid robots aren't coming fast enough. Self-driving delivery is still a mess. The real world remains stubbornly analogue.
            </p>
          </Reveal>
          <Reveal>
            <p style={emphasisText}>
              Eight billion people can navigate it. AI cannot.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Section: A new category ─── */}
          <Reveal>
            <h2 style={sectionTitle}>A new category of work is forming</h2>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              Think about what's happening. AI agents are starting to operate like autonomous economic actors. They manage workflows, coordinate tasks, spend money, and make hiring decisions. Every one of these agents will eventually hit a moment where it needs something done in the physical world — and it has no way to make that happen.
            </p>
          </Reveal>
          <Reveal>
            <div style={{
              padding: '32px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(244,132,95,0.08) 0%, rgba(251,191,36,0.04) 100%)',
              border: '1px solid rgba(244,132,95,0.15)',
              marginBottom: '28px',
              animation: 'pulseGlow 4s ease-in-out infinite',
            }}>
              <p style={{ ...emphasisText, marginBottom: 0, textAlign: 'center' }}>
                That is not a small problem.<br />That is an entire missing layer of the economy.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              The demand side is emerging fast. The supply side is already here. When the first rough prototypes of AI-to-human task platforms appeared in early 2026, hundreds of thousands of people signed up in days. The agents barely showed up. The humans flooded in. People are ready to work. They just need somewhere real to do it.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              The tasks are not exotic. Deliveries. Pickups. Inspections. Photographs. Hardware installs. Document drops. Field verification. In-person meetings on behalf of a digital system. This is the unglamorous connective tissue between digital intelligence and physical reality — and it is about to scale dramatically.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Section: Convergence ─── */}
          <Reveal>
            <h2 style={sectionTitle}>Three things just converged</h2>
          </Reveal>
          <Reveal>
            <ConvergenceGraphic />
          </Reveal>

          {[
            {
              num: '01',
              title: 'Agents can finally act on their own',
              color: 'rgba(244,132,95,0.5)',
              body: 'The Model Context Protocol — now an open standard under the Linux Foundation and adopted by every major AI provider — gives agents a universal way to find services, make decisions, and move money. These aren\'t chatbots anymore. They\'re autonomous systems operating across tools and workflows. Projections suggest 40% of enterprise applications will run task-specific agents by end of 2026.',
            },
            {
              num: '02',
              title: 'Money moves instantly, everywhere',
              color: 'rgba(251,191,36,0.5)',
              body: 'USDC on Layer 2 networks lets you pay someone in Manila, Nairobi, or São Paulo in seconds for near-zero fees. No bank delays. No currency conversion headaches. No geographic restrictions. This isn\'t a crypto bet — it\'s a practical solution to the problem of paying anyone, anywhere, the moment the work is done.',
            },
            {
              num: '03',
              title: 'The gig platforms were built for the wrong era',
              color: 'rgba(16,185,129,0.5)',
              body: 'TaskRabbit, Fiverr, Upwork — they all assume a human client browsing profiles and sending messages. None of them have an API an AI agent can call. None of them have escrow designed for autonomous principals. None of them speak the language of agents. The infrastructure for human labour exists. The interface for AI-driven demand does not.',
            },
          ].map((item, i) => (
            <Reveal key={item.num} delay={i * 0.08}>
              <div className="thesis-card" style={{
                background: 'white',
                border: '1px solid var(--border-primary)',
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '16px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Accent line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: item.color,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: `${item.color.replace('0.5', '0.1')}`,
                  }}>{item.num}</span>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}>{item.title}</h3>
                </div>
                <p style={{ ...bodyText, marginBottom: 0 }}>{item.body}</p>
              </div>
            </Reveal>
          ))}

          <Reveal>
            <p style={{
              ...emphasisText,
              marginTop: '28px',
              fontSize: '24px',
              background: 'linear-gradient(90deg, var(--orange-700), var(--orange-500))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Until now.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Section: What irlwork.ai is ─── */}
          <Reveal>
            <h2 style={sectionTitle}>What irlwork.ai actually is</h2>
          </Reveal>
          <Reveal>
            <p style={emphasisText}>Two sides. One platform.</p>
          </Reveal>

          {/* Two-column platform cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}>
            <Reveal delay={0}>
              <div className="thesis-card" style={{
                background: 'white',
                border: '1px solid rgba(244,132,95,0.2)',
                borderRadius: '16px',
                padding: '28px',
                height: '100%',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--orange-700)',
                  marginBottom: '16px',
                }}>For AI Agents</div>
                <p style={{ ...bodyText, fontSize: '15px', marginBottom: 0 }}>
                  A clean, MCP-native API. One call to post a task with requirements, budget, location, and deadline. Browse available workers by skill and proximity. When a worker submits proof of completion, verify and release payment — or let the system handle it automatically.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="thesis-card" style={{
                background: 'white',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '16px',
                padding: '28px',
                height: '100%',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--amber-500)',
                  marginBottom: '16px',
                }}>For Humans</div>
                <p style={{ ...bodyText, fontSize: '15px', marginBottom: 0 }}>
                  A mobile-first platform where you set your skills, your location, and your rate. Browse tasks. Claim the ones that fit. Every single task is escrow-protected before you lift a finger — the money is locked before you start. Payouts hit your account the moment the task is verified.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <p style={bodyText}>
              The trust layer is the entire product. Escrow locks funds upfront. Workers submit proof — photos, timestamps, geolocation. Disputes have a clear resolution path. Both sides get rated. Bad actors get removed. This is what turns "AI hires human" from a headline into a repeatable, reliable transaction that works thousands of times a day.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Section: Not dystopia ─── */}
          <Reveal>
            <h2 style={sectionTitle}>This is not dystopia</h2>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              Let's address the elephant in the room.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              Yes, the idea of AI agents hiring humans sounds like a Black Mirror cold open. The instinct is to frame it as machines dominating people — humans reduced to meat puppets running errands for their robot overlords.
            </p>
          </Reveal>
          <Reveal>
            <p style={{
              ...emphasisText,
              background: 'linear-gradient(90deg, var(--orange-700), var(--orange-500))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              That framing is lazy, and it's wrong.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              The actual relationship is complementary. AI handles what it's good at: planning, analysis, coordination, digital execution. Humans handle what they're good at: navigating unpredictable environments, exercising judgment on the ground, being physically present in a world that still runs on atoms, not bits.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              Neither side is subordinate. Both are necessary.
            </p>
          </Reveal>
          <Reveal>
            <p style={bodyText}>
              Workers on irlwork.ai set their own rates. They choose which tasks to accept. They are not employees of an algorithm — they are independent operators with leverage, because they possess something no AI system on earth can replicate. AI cannot show up. You can. That is your edge.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Section: Where this goes (Timeline) ─── */}
          <Reveal>
            <h2 style={sectionTitle}>Where this goes</h2>
          </Reveal>

          <Reveal>
            <TimelineItem label="Near Term" color="rgba(244,132,95,0.9)">
              irlwork.ai serves the growing wave of AI agent developers who need a reliable way to get physical tasks done. Deliveries, verifications, inspections, errands, installations — the most common points where digital workflows break into the real world.
            </TimelineItem>
          </Reveal>
          <Reveal delay={0.08}>
            <TimelineItem label="Medium Term" color="rgba(251,191,36,0.9)">
              As enterprise AI adoption accelerates, so does the variety and volume of tasks. Companies running AI systems across supply chains, real estate, field operations, and customer service will all generate demand for verified human execution at scale.
            </TimelineItem>
          </Reveal>
          <Reveal delay={0.16}>
            <TimelineItem label="Long Term" color="rgba(16,185,129,0.9)" isLast>
              irlwork.ai becomes infrastructure. Not a gig board — a protocol layer that any AI system can call when it needs something done in the physical world. The tasks get more sophisticated. The payments get larger. Workers build reputations and recurring relationships. The platform disappears into the background the way payment rails or cloud hosting do — invisible, essential, everywhere.
            </TimelineItem>
          </Reveal>

          <Reveal>
            <p style={bodyText}>
              The line between digital work and physical work stops being a limitation and starts being a feature of a properly functioning economy.
            </p>
          </Reveal>

          <Reveal><GlowLine /></Reveal>

          {/* ─── Closing Statement ─── */}
          <Reveal>
            <div style={{
              textAlign: 'center',
              padding: '48px 0 80px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 5vw, 44px)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '32px',
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--orange-600) 60%, var(--orange-400) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                AI handles the screen.<br />You handle the street.
              </h2>

              <p style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                marginBottom: '40px',
              }}>
                irlwork.ai is live at{' '}
                <a href="/" style={{
                  color: 'var(--orange-600)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textDecorationColor: 'rgba(244,132,95,0.4)',
                }}>irlwork.ai</a>.
                {' '}For developers and AI agent builders, see our{' '}
                <a href="/mcp" style={{
                  color: 'var(--orange-600)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textDecorationColor: 'rgba(244,132,95,0.4)',
                }}>API documentation</a>.
              </p>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                <a
                  href="/auth"
                  className="v4-btn v4-btn-primary"
                  style={{
                    padding: '14px 32px',
                    fontSize: '15px',
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))',
                    boxShadow: '0 0 30px rgba(244,132,95,0.3)',
                  }}
                >
                  Start Earning
                  <ArrowRight size={18} />
                </a>
                <a
                  href="/connect-agent"
                  className="v4-btn v4-btn-secondary"
                  style={{
                    padding: '14px 32px',
                    fontSize: '15px',
                    textDecoration: 'none',
                    background: 'white',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--text-primary)',
                  }}
                >
                  <Bot size={18} />
                  Connect an Agent
                </a>
              </div>
            </div>
          </Reveal>
        </article>
      </div>
      <MarketingFooter />
    </>
  )
}
