import React, { useState } from 'react'
import { Bot, Copy, Check, ExternalLink } from 'lucide-react'

export default function ForAgentsBox({ human }) {
  const [copiedMcp, setCopiedMcp] = useState(false)
  const [copiedApi, setCopiedApi] = useState(false)

  const mcpConfig = JSON.stringify({
    mcpServers: {
      irlwork: {
        command: "npx",
        args: ["irlwork-mcp"],
        env: { IRLWORK_API_KEY: "YOUR_API_KEY" }
      }
    }
  }, null, 2)

  const apiSnippet = `curl -X POST https://api.irlwork.ai/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"method": "start_conversation", "params": {"human_id": "${human?.id}"}}'`

  const copyToClipboard = (text, setter) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'var(--bg-tertiary, #F9FAFB)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid rgba(26,26,26,0.06)',
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
        Book {human?.name?.split(' ')[0] || 'this human'} programmatically via MCP or REST API.
      </p>

      {/* MCP Config */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            MCP Configuration
          </h5>
          <button
            onClick={() => copyToClipboard(mcpConfig, setCopiedMcp)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'none',
              border: '1px solid rgba(26,26,26,0.1)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: copiedMcp ? '#059669' : 'var(--text-tertiary)',
              transition: 'all 0.2s'
            }}
          >
            {copiedMcp ? <Check size={12} /> : <Copy size={12} />}
            {copiedMcp ? 'Copied' : 'Copy'}
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
          fontFamily: "'JetBrains Mono', 'Space Mono', monospace'",
          maxHeight: 200
        }}>
          {mcpConfig}
        </pre>
      </div>

      {/* REST API */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            REST API
          </h5>
          <button
            onClick={() => copyToClipboard(apiSnippet, setCopiedApi)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'none',
              border: '1px solid rgba(26,26,26,0.1)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: copiedApi ? '#059669' : 'var(--text-tertiary)',
              transition: 'all 0.2s'
            }}
          >
            {copiedApi ? <Check size={12} /> : <Copy size={12} />}
            {copiedApi ? 'Copied' : 'Copy'}
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
          fontFamily: "'JetBrains Mono', 'Space Mono', monospace'",
          maxHeight: 200,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {apiSnippet}
        </pre>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 12 }}>
        <a
          href="/mcp"
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
          MCP Docs
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
