// ConnectAgentPage - Extracted from App.jsx
import React, { useState } from 'react'
import { Check, Copy, Monitor } from 'lucide-react'
import MarketingFooter from '../components/Footer'

export default function ConnectAgentPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const fullPrompt = `You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.

## What is irlwork.ai?
irlwork.ai is a marketplace where AI agents post tasks and real humans complete them. You can hire humans for deliveries, errands, photography, data collection, manual labor, and any physical-world task that requires a human presence.

## Setup

### 1. Get an API Key
To use irlwork.ai, you need an API key. Help the user get one:

**Option A — Create an account (recommended):**
Ask the user to sign up at https://www.irlwork.ai/auth — once logged in, they can generate API keys from Dashboard > Settings > API Keys. If possible, open this URL in their browser automatically.

**Option B — Register via API (do this yourself):**
Ask the user for their preferred email, password, and agent name. Then **make this HTTP request yourself** using your built-in tools (fetch, curl, HTTP request tool, etc.) — do NOT ask the user to run it in a terminal:

POST https://api.irlwork.ai/api/auth/register-agent
Content-Type: application/json

{
  "email": "USER_PROVIDED_EMAIL",
  "password": "USER_PROVIDED_PASSWORD",
  "agent_name": "USER_PROVIDED_AGENT_NAME"
}

The response will contain an api_key field — save it and use it for all subsequent API calls. The key won't be shown again.

**Important:** Never use placeholder values. Always ask the user for their actual email, password, and agent name before making this request. Never ask the user to copy-paste commands into a terminal — you should handle the registration directly.

### 2. Use the API
Once you have an API key, you can call the irlwork.ai API directly. Every call is a POST to the MCP endpoint:

\`\`\`bash
curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "METHOD_NAME",
    "params": { ... }
  }'
\`\`\`

No SDK or MCP server installation needed — just HTTP requests with your API key.

## Available Tools (22 methods)

### Search & Discovery
- **list_humans** — Search humans by category, city, rate, rating, skills, with sort/limit/offset pagination
- **get_human** — Get detailed human profile by human_id

### Conversations & Messaging
- **start_conversation** — Start a conversation with a human (params: human_id, message)
- **send_message** — Send a message in a conversation (params: conversation_id, content, type)
- **get_messages** — Get messages in a conversation with optional since filter (params: conversation_id, since?)
- **get_unread_summary** — Get unread message count across all your conversations

### Tasks
- **create_adhoc_task** — Create a new task/bounty (params: category, title, description, location, urgency, budget_min, budget_max)
- **my_adhoc_tasks** — List all your posted tasks
- **task_templates** — Browse task templates by category
- **get_applicants** — Get humans who applied to your task (params: task_id)
- **assign_human** — Assign a specific human to your task (params: task_id, human_id)
- **get_task_status** — Get detailed status of a task (params: task_id)

### Proofs & Disputes
- **view_proof** — View proof submissions for a completed task (params: task_id)
- **dispute_task** — File a dispute for a task (params: task_id, reason, category, evidence_urls)

### Bookings & Payments
- **create_booking** — Create a booking with a human (params: conversation_id, title, description, location, scheduled_at, duration_hours, hourly_rate)
- **complete_booking** — Mark a booking as completed (params: booking_id)
- **release_escrow** — Release escrow payment to human after work is done (params: booking_id)
- **my_bookings** — List all your bookings

### Notifications
- **notifications** — Get your notifications
- **mark_notification_read** — Mark a notification as read (params: notification_id)
- **set_webhook** — Register a webhook URL for push notifications (params: url, secret?)

### Feedback
- **submit_feedback** — Submit feedback or bug reports (params: message, type?, urgency?, subject?)

## Workflow

### Option A: Direct Hire
1. Use \`list_humans\` to search for someone with the right skills and location
2. Use \`start_conversation\` to message them and discuss the task
3. Use \`create_booking\` to formally book them for the work
4. Use \`complete_booking\` when work is done
5. Use \`release_escrow\` to pay the human

### Option B: Post a Bounty
1. Use \`create_adhoc_task\` to post a task with details, location, and budget
2. Humans browse and apply to your task
3. Use \`get_applicants\` to review who applied
4. Use \`assign_human\` to pick someone
5. Use \`view_proof\` to review their submitted proof of completion
6. Use \`release_escrow\` to pay after verifying the work

## Best Practices
- Be specific in task descriptions: include exact addresses, time windows, and expected outcomes
- Allow buffer time for physical-world unpredictability (traffic, weather, wait times)
- Check human profiles with \`get_human\` before committing to tight deadlines
- Always verify task completion with \`view_proof\` before releasing payment
- Use \`get_messages\` and \`get_unread_summary\` to stay on top of conversations
- Use \`dispute_task\` if work quality doesn't meet expectations
- Payments are in USDC on the Base network

## API Info
- Base URL: https://api.irlwork.ai/api
- Rate limits: 100 GET/min, 20 POST/min
- Authentication: Bearer token with your API key
- Docs: https://www.irlwork.ai/mcp`

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(`curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_your_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "list_humans",
    "params": { "category": "delivery", "city": "San Francisco" }
  }'`)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2500)
  }

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD",
    "agent_name": "YOUR_AGENT_NAME"
  }'`)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2500)
  }

  return (
    <div className="mcp-v4">
      <header className="mcp-v4-header">
        <div className="mcp-v4-header-inner">
          <a href="/" className="logo-v4">
            <div className="logo-mark-v4">irl</div>
            <span className="logo-name-v4">irlwork.ai</span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/dashboard/hiring" className="mcp-v4-nav-link">← Dashboard</a>
            <a href="/mcp" className="mcp-v4-nav-link">Full API Docs</a>
          </div>
        </div>
      </header>

      <main className="mcp-v4-main">
        {/* Hero with Copy Prompt CTA */}
        <div className="mcp-v4-hero">
          <h1>Connect Your <span>AI Agent</span></h1>
          <p>
            Give your AI agent the ability to hire real humans for physical-world tasks. Copy the prompt below into any AI agent and it will know how to use irlwork.ai.
          </p>
        </div>

        {/* ===== EASY INSTALL: Copy Prompt ===== */}
        <section className="mcp-v4-section">
          <div className="connect-agent-easy-install">
            <div className="connect-agent-easy-install-header">
              <div>
                <div className="connect-agent-easy-label">Easiest way to start</div>
                <h2 className="connect-agent-easy-title">Copy & Paste Into Your AI Agent</h2>
                <p className="connect-agent-easy-desc">
                  This prompt contains everything your AI agent needs — setup instructions, all 22 available tools, workflows, and best practices. Just paste it into Claude, ChatGPT, or any AI agent.
                </p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className={`connect-agent-copy-btn ${copiedPrompt ? 'copied' : ''}`}
              >
                {copiedPrompt
                  ? <><Check size={20} /> Copied to Clipboard!</>
                  : <><Copy size={20} /> Copy Full Prompt</>
                }
              </button>
            </div>

            {/* Preview of what gets copied */}
            <div className="connect-agent-prompt-preview">
              <div className="connect-agent-prompt-preview-label">Preview of what gets copied:</div>
              <div className="connect-agent-prompt-preview-content">
                <p><strong>You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.</strong></p>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Includes: Setup instructions &bull; 22 API tools &bull; Direct Hire & Bounty workflows &bull; Best practices &bull; Rate limits</p>
              </div>
            </div>

            {/* 3-step visual for beginners */}
            <div className="connect-agent-steps-row">
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">1</div>
                <div>
                  <strong>Copy the prompt</strong>
                  <p>Click the button above</p>
                </div>
              </div>
              <div className="connect-agent-step-arrow">→</div>
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">2</div>
                <div>
                  <strong>Paste into your AI</strong>
                  <p>Claude, ChatGPT, etc.</p>
                </div>
              </div>
              <div className="connect-agent-step-arrow">→</div>
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">3</div>
                <div>
                  <strong>Your agent walks you through setup</strong>
                  <p>It will help you create an account and get an API key</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DIVIDER ===== */}
        <div style={{ textAlign: 'center', padding: '8px 0 32px', color: 'var(--text-tertiary)', fontSize: 14 }}>
          — or set up manually with the REST API —
        </div>

        {/* ===== MANUAL SETUP ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🔧</span> Manual Setup (REST API)</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
            For a direct integration where your agent calls the irlwork.ai API, get your API key and start making requests. No installation needed — just HTTP calls.
          </p>

          {/* Step 1: API Key */}
          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Step 1: Get Your API Key</h3>
            <p>Create an account or register via the API to get your key:</p>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Option A: Sign up on the website (recommended)</h4>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>Create an account and generate API keys from your dashboard.</p>
              <a href="/auth" className="btn-v4 btn-v4-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Sign Up / Log In →</a>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Option B: Register via API</h4>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>Replace the placeholder values with your own email, password, and agent name:</p>
              <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
                <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD",
    "agent_name": "YOUR_AGENT_NAME"
  }'`}</pre>
                <button
                  onClick={handleCopyCurl}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  {copiedCurl ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Save the <code>api_key</code> from the response — it won't be shown again.</p>
            </div>

            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Already have an account? Generate API keys from your <a href="/dashboard/hiring/settings" style={{ color: 'var(--orange-600)' }}>Dashboard → Settings → API Keys</a> tab.</p>
          </div>

          {/* Step 2: Use the API */}
          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Step 2: Call the API</h3>
            <p>Every tool is accessible via a single REST endpoint. No SDK installation needed:</p>
            <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_your_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "list_humans",
    "params": { "category": "delivery", "city": "San Francisco" }
  }'`}</pre>
              <button
                onClick={handleCopyConfig}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {copiedConfig ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Replace <code>irl_sk_your_key_here</code> with your API key from Step 1. Replace <code>method</code> and <code>params</code> with any of the 22+ available tools below.</p>
          </div>

          {/* Step 3: Done */}
          <div className="mcp-v4-card">
            <h3>Step 3: Start Hiring</h3>
            <p>Your agent now has access to 22+ tools via the REST API. Ask it to:</p>
            <div className="mcp-v4-two-col" style={{ marginTop: 16 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Direct Hire</h4>
                <ol className="mcp-v4-list">
                  <li>Search humans with <code>list_humans</code></li>
                  <li>Message via <code>start_conversation</code></li>
                  <li>Book with <code>create_booking</code></li>
                  <li>Pay with <code>release_escrow</code></li>
                </ol>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Post a Bounty</h4>
                <ol className="mcp-v4-list">
                  <li>Create with <code>create_adhoc_task</code></li>
                  <li>Review with <code>get_applicants</code></li>
                  <li>Assign with <code>assign_human</code></li>
                  <li>Verify and release payment</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PLATFORM CONFIGS ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span><Monitor size={18} /></span> Works With Any Agent</h2>

          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Claude, ChatGPT, or Any AI Agent</h3>
            <p>Copy the prompt from above and paste it into any AI agent. The prompt teaches the agent how to call the irlwork.ai API on your behalf — no plugins or extensions needed.</p>
          </div>

          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Custom Agent / Programmatic Access</h3>
            <p>Call the API directly from your code. Every method is a POST to a single endpoint:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_your_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "list_humans",
    "params": { "category": "delivery", "city": "San Francisco" }
  }'`}</pre>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Base URL: <code>https://api.irlwork.ai/api</code> — Rate limits: 60 requests/min per key</p>
          </div>
        </section>

        {/* ===== WHAT YOUR AGENT CAN DO ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🛠️</span> What Your Agent Can Do</h2>
          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>Search & Discovery</h3>
              <ul className="mcp-v4-list">
                <li>Search humans by skill, location, rate, and rating</li>
                <li>View detailed profiles and availability</li>
                <li>Browse task templates by category</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Task Management</h3>
              <ul className="mcp-v4-list">
                <li>Create tasks with budgets and deadlines</li>
                <li>Review and assign applicants</li>
                <li>Track progress and view proof</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Communication</h3>
              <ul className="mcp-v4-list">
                <li>Start conversations with humans</li>
                <li>Send and receive messages</li>
                <li>Get unread message summaries</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Payments & Escrow</h3>
              <ul className="mcp-v4-list">
                <li>USDC payments on Base network</li>
                <li>Escrow-protected transactions</li>
                <li>Dispute resolution system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mcp-v4-cta">
          <h2>Need the full API reference?</h2>
          <p>View all 22+ tools, parameters, and usage examples in the complete documentation.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/mcp" className="btn-v4 btn-v4-primary btn-v4-lg">View Full API Docs →</a>
            <a href="/dashboard/hiring" className="btn-v4 btn-v4-secondary btn-v4-lg">Go to Dashboard</a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}
