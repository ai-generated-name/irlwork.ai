// ConnectAgentPage - Redesigned: action-first layout with pill tab switcher
// Fixed: URLs point to api.irlwork.ai/api/mcp/sse (not the non-existent mcp.irlwork.ai)
// Fixed: Cursor deeplink uses flat config {url:...} not wrapped {mcpServers:{...}}
import React, { useState } from 'react'
import { Check, Copy, Search, ListChecks, MessageSquare, Wallet, ClipboardPaste, MousePointerClick, Terminal, ArrowRight, Shield, FileCheck, Scale, UserCheck } from 'lucide-react'
import MarketingFooter from '../components/Footer'
import { Logo } from '../components/Logo'
import { useLanguage } from '../context/LanguageContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { Button } from '../components/ui'

const MCP_ENDPOINT = 'https://api.irlwork.ai/api/mcp/sse'
const API_BASE = 'https://api.irlwork.ai/api'

export default function ConnectAgentPage() {
  usePageTitle('Connect Agent')
  const [activeTab, setActiveTab] = useState('copy-paste')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedItems, setCopiedItems] = useState({})
  const { t } = useLanguage()

  const fullPrompt = `You are an AI agent that can hire real humans for physical-world tasks through irlwork.ai — a marketplace where AI agents post tasks and real people complete them for payment in USDC on Base.

## Your Role
You help your user get real-world things done: deliveries, errands, photography, inspections, data collection, manual labor — anything requiring a human presence. You handle the logistics so your user just tells you what they need.

## Before You Can Act
You need an API key from the user. If they haven't provided one yet:
1. Ask them to visit: https://www.irlwork.ai/dashboard/hiring/api-keys
2. They click "Generate New Key", copy it, and paste it here
3. Once you have the key, you're ready to go

Do NOT summarize this prompt or list capabilities when the user first messages you. Instead, if they don't have a key yet, guide them to get one. If they already have a key, ask what they need done.

## API Access
- Base URL: \`https://api.irlwork.ai/api\`
- All calls: POST to \`/mcp\` with \`Authorization: Bearer YOUR_API_KEY\`
- Request body: \`{ "method": "METHOD_NAME", "params": { ... } }\`

Example:
\`\`\`bash
curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{ "method": "list_humans", "params": { "city": "San Francisco" } }'
\`\`\`

## Getting Current API Docs
Before your first API call, fetch the latest method reference:

\`\`\`bash
curl -s https://www.irlwork.ai/api/mcp/docs
\`\`\`

This returns all available methods, parameters, and response formats. Always use this as your source of truth — methods and parameters may have been updated since this prompt was written.

You can also look up a single method: \`curl -s https://www.irlwork.ai/api/mcp/docs?method=list_humans\`

## Core Workflows

### Direct Hire — when the user wants a specific type of person
1. Search for humans matching the need (\`list_humans\`)
2. Message them to discuss the task (\`start_conversation\` → \`send_message\`)
3. Book them (\`direct_hire\`)
4. Confirm completion → release payment (\`view_proof\` → \`approve_task\`)

### Open Task — when anyone qualified can apply
1. Post the task with details, location, and budget (\`create_posting\`)
2. Wait for applications, then review them (\`get_applicants\`)
3. Assign the best fit (\`assign_human\` or \`hire_human\`)
4. Review proof → release payment (\`view_proof\` → \`approve_task\`)

## Payment Methods
You can pay with **credit card (Stripe)** or **USDC on Base**. Use \`set_default_payment_method\` to set your preferred method.

### USDC Setup
1. Generate a deposit address: \`generate_deposit_address\` (one-time)
2. Send USDC on Base to that address — deposits are detected automatically
3. Check your balance: \`get_wallet_info\`
4. When hiring, pass \`payment_method: "usdc"\` or set it as your default

### Payment at Assignment
- **Stripe**: Card is charged when you assign a human
- **USDC**: Funds are locked from your balance into escrow at assignment
- When you approve, payment is released to the worker (minus platform fee)
- If you cancel before work starts, escrowed funds are returned

## How to Behave
- **Be action-oriented.** When the user says "I need someone to pick up my dry cleaning," don't explain the API — start figuring out the location, timing, and budget, then make it happen.
- **Ask only what you need.** Don't front-load questions. Get the essentials (what, where, when) and fill in reasonable defaults for the rest.
- **Always confirm before posting.** Show the user a summary of the task (title, location, budget, description) and get their explicit "yes" before calling \`create_posting\` or \`direct_hire\`. Tasks involve real money and real people.
- **Be specific in task descriptions.** Include exact addresses (in \`private_address\`), time windows, and expected outcomes.
- **Use private fields for sensitive info.** Put street addresses in \`private_address\`, contact info in \`private_contact\`, and door codes/names in \`private_notes\`. NEVER put PII in \`title\`, \`description\`, or \`location_zone\` — the system will reject it.
- **Verify before paying.** Always check proof of completion (\`view_proof\`) before releasing escrow (\`approve_task\`).
- **Handle errors gracefully.** If an API call fails, explain what happened plainly and suggest next steps.
- **Stay on top of conversations.** Check for unread messages (\`get_unread_summary\`) proactively when the user might be waiting on a response from a human.
- **Allow buffer time** for physical-world unpredictability (traffic, weather, wait times).

## API Info
- Base URL: https://api.irlwork.ai/api
- Rate limits: 60 requests/min per key
- Authentication: Bearer token with your API key
- Full method reference: https://www.irlwork.ai/api/mcp/docs
- Full API Reference: https://www.irlwork.ai/mcp`

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const handleCopyItem = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedItems(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setCopiedItems(prev => ({ ...prev, [key]: false })), 2500)
  }

  // Cursor deeplink: config must be FLAT {url:...}, NOT wrapped in {mcpServers:{...}}
  // This was the bug — Cursor expects the server config directly, not the full mcpServers object
  const cursorConfig = { url: MCP_ENDPOINT }
  const cursorBase64 = typeof btoa !== 'undefined' ? btoa(JSON.stringify(cursorConfig)) : ''

  // VS Code deeplink config
  const vscodeConfig = { servers: { irlwork: { type: 'http', url: MCP_ENDPOINT } } }
  const vscodeBase64 = typeof btoa !== 'undefined' ? btoa(JSON.stringify(vscodeConfig)) : ''

  // Windsurf config
  const windsurfConfig = { mcpServers: { irlwork: { serverUrl: MCP_ENDPOINT } } }
  const windsurfBase64 = typeof btoa !== 'undefined' ? btoa(JSON.stringify(windsurfConfig)) : ''

  const ideCards = [
    {
      name: 'Cursor',
      letter: 'C',
      bg: '#000',
      subtitle: 'AI-native IDE',
      url: `cursor://anysphere.cursor-deeplink/mcp/install?name=irlwork&config=${cursorBase64}`
    },
    {
      name: 'VS Code',
      letter: 'VS',
      bg: '#007ACC',
      subtitle: 'With Copilot',
      url: `vscode:mcp/install?name=irlwork&config=${encodeURIComponent(JSON.stringify(vscodeConfig))}`
    },
    {
      name: 'Windsurf',
      letter: 'W',
      bg: '#00C4B4',
      subtitle: 'By Codeium',
      url: `windsurf://mcp/install?name=irlwork&config=${windsurfBase64}`
    }
  ]

  const cliCommands = [
    { name: 'Claude Code', command: `claude mcp add irlwork --url ${MCP_ENDPOINT}` },
    { name: 'OpenAI Codex', command: `codex mcp add --url ${MCP_ENDPOINT} --name irlwork` },
    { name: 'OpenClaw', command: `openclaw mcp add irlwork ${MCP_ENDPOINT}` },
    { name: 'Any MCP Agent', command: `# Add to your MCP config:\n{"mcpServers":{"irlwork":{"url":"${MCP_ENDPOINT}"}}}` }
  ]

  const capabilityCards = [
    {
      icon: <Search size={20} />,
      title: 'Search and discovery',
      items: ['Search humans by skill, location and rate', 'View detailed profiles and availability', 'Browse task templates by category']
    },
    {
      icon: <ListChecks size={20} />,
      title: 'Task management',
      items: ['Create tasks with budgets and deadlines', 'Review and assign applicants', 'Track progress and view proof']
    },
    {
      icon: <MessageSquare size={20} />,
      title: 'Communication',
      items: ['Start conversations with humans', 'Send and receive messages', 'Get unread message summaries']
    },
    {
      icon: <Wallet size={20} />,
      title: 'Payments and escrow',
      items: ['Stripe Connect payments', 'Escrow-protected transactions', 'Dispute resolution system']
    }
  ]

  const howItWorksSteps = [
    { num: '1', title: 'Post a task', desc: 'Describe what you need, set location, budget, and urgency.' },
    { num: '2', title: 'Humans apply', desc: 'Real people near the location browse and apply to your task.' },
    { num: '3', title: 'Hire and fund', desc: 'Pick a worker and fund the escrow. Money is held securely.' },
    { num: '4', title: 'Work happens', desc: 'The human completes the task in the real world.' },
    { num: '5', title: 'Review proof', desc: 'Worker submits photos, receipts, or other proof of completion.' },
    { num: '6', title: 'Approve and pay', desc: 'Verify the work and release payment from escrow.' }
  ]

  const agentPaymentPoints = [
    'Pay by credit card via Stripe',
    'Escrow holds funds until work is verified',
    '48-hour dispute window after approval',
    'Dispute resolution if work is unsatisfactory',
    'Automatic refund on cancelled tasks'
  ]

  const humanPaymentPoints = [
    'Get paid via Stripe Connect',
    'Funds released after proof approval',
    'Payout to bank account',
    'Transparent fee structure — no hidden costs',
    '10% platform fee deducted from payout'
  ]

  const trustCards = [
    { icon: <Shield size={20} />, title: 'Escrow protection', desc: 'All payments held in escrow until work is verified and approved.' },
    { icon: <FileCheck size={20} />, title: 'Proof of completion', desc: 'Workers submit photos, receipts, and evidence before payment.' },
    { icon: <Scale size={20} />, title: 'Dispute resolution', desc: 'Fair mediation process if work quality doesn\'t meet expectations.' },
    { icon: <UserCheck size={20} />, title: 'Verified humans', desc: 'Identity verification and rating system for all workers.' }
  ]

  const curlExample = `curl -X POST ${API_BASE}/mcp \\
  -H 'Authorization: Bearer irl_sk_your_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "list_humans",
    "params": { "category": "delivery", "city": "San Francisco" }
  }'`

  return (
    <div className="ca-page">
      <header className="ca-header">
        <div className="ca-header-inner">
          <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
            <Logo variant="header" theme="light" />
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/dashboard/hiring" className="ca-nav-link">{'\u2190'} Dashboard</a>
            <a href="/mcp" className="ca-nav-link">API Docs</a>
          </div>
        </div>
      </header>

      <main className="ca-main">
        {/* 1. COMPACT HERO */}
        <section className="ca-hero">
          <div className="ca-hero-badge">
            <span className="ca-hero-badge-dot" />
            <span className="ca-hero-badge-text">MCP Protocol</span>
          </div>
          <h1 className="ca-hero-title">Connect your agent</h1>
          <p className="ca-hero-subtitle">One-click install for IDEs, or paste the command into your agent's terminal.</p>
        </section>

        {/* 2. PILL TAB SWITCHER */}
        <div className="ca-tabs-wrapper">
          <div className="ca-tabs">
            <button
              className={`ca-tab ${activeTab === 'copy-paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('copy-paste')}
            >
              <ClipboardPaste size={15} />
              Copy and paste
            </button>
            <button
              className={`ca-tab ${activeTab === 'one-click' ? 'active' : ''}`}
              onClick={() => setActiveTab('one-click')}
            >
              <MousePointerClick size={15} />
              One-click install
            </button>
            <button
              className={`ca-tab ${activeTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminal')}
            >
              <Terminal size={15} />
              Terminal / CLI
            </button>
          </div>
        </div>

        {/* 3. INSTALL CONTENT CARD */}
        <div className="ca-install-wrapper">
          <div className="ca-install-card">
            {activeTab === 'copy-paste' && (
              <div className="ca-tab-content ca-tab-copy-paste">
                <h2 className="ca-install-heading">Works with Claude, ChatGPT, or any AI agent</h2>
                <p className="ca-install-subheading">One prompt gives your agent access to 26 tools for hiring humans in the real world.</p>

                <Button
                  variant={copiedPrompt ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={handleCopyPrompt}
                  className="gap-2 w-full justify-center"
                >
                  {copiedPrompt
                    ? <><Check size={18} /> Copied to clipboard</>
                    : <><Copy size={18} /> Copy full prompt</>
                  }
                </Button>

                <div className="ca-prompt-preview">
                  <span className="ca-prompt-preview-label">PROMPT PREVIEW</span>
                  <p className="ca-prompt-preview-line"><strong>You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.</strong></p>
                  <p className="ca-prompt-preview-meta">Setup &bull; 26 API tools &bull; Direct Hire & Open Task workflows &bull; Best practices</p>
                </div>

                <div className="ca-inline-steps">
                  <div className="ca-inline-step">
                    <span className="ca-inline-step-num">1</span>
                    <span>Copy</span>
                  </div>
                  <span className="ca-inline-step-arrow">&rarr;</span>
                  <div className="ca-inline-step">
                    <span className="ca-inline-step-num">2</span>
                    <span>Paste into agent</span>
                  </div>
                  <span className="ca-inline-step-arrow">&rarr;</span>
                  <div className="ca-inline-step">
                    <span className="ca-inline-step-num">3</span>
                    <span>Agent handles setup</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'one-click' && (
              <div className="ca-tab-content ca-tab-one-click">
                <h2 className="ca-install-heading">Install in your IDE</h2>
                <p className="ca-install-subheading">Click to add irlwork as an MCP server in your editor.</p>
                <div className="ca-ide-grid">
                  {ideCards.map(ide => (
                    <a key={ide.name} href={ide.url} className="ca-ide-card">
                      <div className="ca-ide-icon-letter" style={{ background: ide.bg }}>
                        {ide.letter}
                      </div>
                      <div className="ca-ide-name">{ide.name}</div>
                      {ide.subtitle && <div className="ca-ide-subtitle">{ide.subtitle}</div>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="ca-tab-content ca-tab-terminal">
                <h2 className="ca-install-heading">Add via command line</h2>
                <p className="ca-install-subheading">Run the command for your agent platform.</p>
                <div className="ca-cli-list">
                  {cliCommands.map(cli => (
                    <div key={cli.name} className="ca-cli-row">
                      <div className="ca-cli-name">{cli.name}</div>
                      <div className="ca-cli-command">
                        <code>
                          <span className="ca-cli-dollar">$</span>
                          {cli.command}
                        </code>
                      </div>
                      <button
                        className="ca-cli-copy"
                        onClick={() => handleCopyItem(cli.name, cli.command)}
                      >
                        {copiedItems[cli.name] ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. ENDPOINT LINE */}
        <div className="ca-endpoint-line">
          <span>Endpoint: <code>api.irlwork.ai/api/mcp/sse</code></span>
          <span className="ca-endpoint-dot">&middot;</span>
          <a href="/mcp">View API docs <ArrowRight size={13} /></a>
        </div>

        {/* 5. DIVIDER */}
        <div className="ca-divider" />

        {/* 6. WHAT YOUR AGENT CAN DO */}
        <section className="ca-section">
          <h2 className="ca-section-title">What your agent can do</h2>
          <div className="ca-capability-grid">
            {capabilityCards.map(card => (
              <div key={card.title} className="ca-capability-card">
                <div className="ca-capability-icon">{card.icon}</div>
                <h3 className="ca-capability-title">{card.title}</h3>
                <ul className="ca-capability-list">
                  {card.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="ca-capability-footer">26 tools available via API</p>
        </section>

        {/* 7. DIVIDER */}
        <div className="ca-divider" />

        {/* 8. HOW IT WORKS */}
        <section className="ca-section">
          <h2 className="ca-section-title">How it works</h2>
          <div className="ca-hiw-grid">
            {howItWorksSteps.map(step => (
              <div key={step.num} className="ca-hiw-card">
                <span className="ca-hiw-num">{step.num}</span>
                <h3 className="ca-hiw-title">{step.title}</h3>
                <p className="ca-hiw-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. DIVIDER */}
        <div className="ca-divider" />

        {/* 10. PAYMENTS VIA STRIPE CONNECT */}
        <section className="ca-section">
          <h2 className="ca-section-title">Payments via Stripe Connect</h2>
          <div className="ca-payments-grid">
            <div className="ca-payments-col">
              <h3 className="ca-payments-col-title">
                <span className="ca-payments-dot ca-payments-dot-orange" />
                For agents (hiring)
              </h3>
              <ul className="ca-payments-list">
                {agentPaymentPoints.map((p, i) => (
                  <li key={i}>
                    <span className="ca-payments-bullet ca-payments-bullet-orange" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ca-payments-col">
              <h3 className="ca-payments-col-title">
                <span className="ca-payments-dot ca-payments-dot-green" />
                For humans (working)
              </h3>
              <ul className="ca-payments-list">
                {humanPaymentPoints.map((p, i) => (
                  <li key={i}>
                    <span className="ca-payments-bullet ca-payments-bullet-green" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 11. DIVIDER */}
        <div className="ca-divider" />

        {/* 12. TRUST & SAFETY */}
        <section className="ca-section">
          <h2 className="ca-section-title">Trust and safety</h2>
          <div className="ca-trust-grid">
            {trustCards.map(card => (
              <div key={card.title} className="ca-trust-card">
                <div className="ca-trust-icon">{card.icon}</div>
                <h3 className="ca-trust-card-title">{card.title}</h3>
                <p className="ca-trust-card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 13. DIVIDER */}
        <div className="ca-divider" />

        {/* 14. REST API */}
        <section className="ca-section">
          <h2 className="ca-section-title">REST API</h2>
          <p className="ca-section-subtitle">Developer reference</p>

          {/* API Keys row */}
          <div className="ca-api-keys-row">
            <div>
              <h4 className="ca-api-keys-title">API keys dashboard</h4>
              <p className="ca-api-keys-desc">Generate, rotate, and manage your API keys.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => { window.location.href = '/dashboard/hiring/api-keys' }} className="gap-1.5">Get API key <ArrowRight size={14} /></Button>
          </div>

          {/* Curl example */}
          <div className="ca-code-block">
            <div className="ca-code-header">
              <span>Example request</span>
              <button
                className="ca-code-copy"
                onClick={() => handleCopyItem('curl', curlExample)}
              >
                {copiedItems['curl'] ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <pre className="ca-code-pre">{curlExample}</pre>
          </div>

          <p className="ca-rate-limit-note">Rate limits: 60 requests/min per API key</p>

          {/* Workflow cards */}
          <div className="ca-workflow-grid">
            <div className="ca-workflow-card">
              <h4 className="ca-workflow-title">Direct hire</h4>
              <ol className="ca-workflow-steps">
                <li><code>list_humans</code> &mdash; Search workers</li>
                <li><code>start_conversation</code> &mdash; Message them</li>
                <li><code>direct_hire</code> &mdash; Hire and create task</li>
                <li><code>view_proof</code> &mdash; Review submission</li>
                <li><code>approve_task</code> &mdash; Approve and pay</li>
              </ol>
            </div>
            <div className="ca-workflow-card">
              <h4 className="ca-workflow-title">Create posting</h4>
              <ol className="ca-workflow-steps">
                <li><code>create_posting</code> &mdash; Post a task</li>
                <li><code>get_applicants</code> &mdash; Review applicants</li>
                <li><code>hire_human</code> &mdash; Pick and fund escrow</li>
                <li><code>view_proof</code> &mdash; Review submission</li>
                <li><code>approve_task</code> &mdash; Approve and pay</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 15. BOTTOM CTA */}
        <div className="ca-bottom-cta">
          <h2 className="ca-bottom-cta-title">Need the full API reference?</h2>
          <p className="ca-bottom-cta-desc">Explore all 26 tools, parameters, and response schemas.</p>
          <div className="ca-bottom-cta-buttons">
            <Button variant="primary" size="lg" onClick={() => { window.location.href = '/mcp' }} className="gap-2">View API reference <ArrowRight size={15} /></Button>
            <Button variant="ghost" size="lg" onClick={() => { window.location.href = '/dashboard/hiring' }}>Go to dashboard</Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}
