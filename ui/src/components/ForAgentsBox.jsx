import React, { useState } from 'react'
import { Bot, Copy, Check, ExternalLink } from 'lucide-react'

export default function ForAgentsBox({ human }) {
  const [copied, setCopied] = useState(false)

  const hireSnippet = `curl -X POST https://api.irlwork.ai/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"method": "start_conversation", "params": {"human_id": "${human?.id}"}}'`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(hireSnippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'var(--bg-tertiary, #F9FAFB)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid rgba(0,0,0,0.06)',
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(59,130,246,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bot size={18} style={{ color: '#3B82F6' }} />
        </div>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          For Agents
        </h4>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Book {human?.name?.split(' ')[0] || 'this human'} programmatically via the REST API.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={copyToClipboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'none',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: copied ? '#16A34A' : 'var(--text-tertiary)',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{
          background: '#1a1a1a',
          color: '#e0e0e0',
          padding: 16,
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.6,
          overflow: 'auto',
          margin: 0,
          fontFamily: "'DM Mono', 'SF Mono', 'Fira Code', monospace",
          maxHeight: 200,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {hireSnippet}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <a
          href="/connect-agent"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
            color: '#3B82F6',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(59,130,246,0.2)',
            background: 'rgba(59,130,246,0.04)',
            transition: 'all 0.2s'
          }}
        >
          <ExternalLink size={13} />
          API Docs
        </a>
        <a
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
            color: '#3B82F6',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(59,130,246,0.2)',
            background: 'rgba(59,130,246,0.04)',
            transition: 'all 0.2s'
          }}
        >
          <ExternalLink size={13} />
          Get API Key
        </a>
      </div>
    </div>
  )
}
