import React, { useState } from 'react'

const PLATFORMS = {
  twitter: {
    label: 'Twitter / X',
    url: (h) => `https://x.com/${h}`,
    color: '#1DA1F2',
    placeholder: 'username',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  },
  instagram: {
    label: 'Instagram',
    url: (h) => `https://instagram.com/${h}`,
    color: '#E4405F',
    placeholder: 'username',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    )
  },
  linkedin: {
    label: 'LinkedIn',
    url: (h) => `https://linkedin.com/in/${h}`,
    color: '#0A66C2',
    placeholder: 'username',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  },
  github: {
    label: 'GitHub',
    url: (h) => `https://github.com/${h}`,
    color: '#333333',
    placeholder: 'username',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    )
  },
  tiktok: {
    label: 'TikTok',
    url: (h) => `https://tiktok.com/@${h}`,
    color: '#000000',
    placeholder: 'username',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.18z" />
      </svg>
    )
  },
  youtube: {
    label: 'YouTube',
    url: (h) => `https://youtube.com/@${h}`,
    color: '#FF0000',
    placeholder: 'channel',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  }
}

const PLATFORM_ORDER = ['twitter', 'instagram', 'linkedin', 'github', 'tiktok', 'youtube']

// Extract a clean handle/username from either a raw handle or a full URL
function extractHandle(platform, value) {
  if (!value || typeof value !== 'string') return ''
  let v = value.trim()
  if (!v) return ''

  // Normalize URLs without protocol (e.g. "x.com/user" → "https://x.com/user")
  if (/^(www\.)?(x|twitter|instagram|linkedin|github|tiktok|youtube|youtu)\.(com|be)\//i.test(v)) {
    v = 'https://' + v
  }

  // If it looks like a URL, try to extract the path segment
  if (/^https?:\/\//i.test(v)) {
    try {
      const url = new URL(v)
      const host = url.hostname.replace(/^www\./, '').toLowerCase()
      const pathParts = url.pathname.split('/').filter(Boolean)

      // Platform-specific host matching
      const hostMap = {
        twitter: ['x.com', 'twitter.com'],
        instagram: ['instagram.com'],
        linkedin: ['linkedin.com'],
        github: ['github.com'],
        tiktok: ['tiktok.com'],
        youtube: ['youtube.com', 'youtu.be']
      }

      const validHosts = hostMap[platform] || []
      if (validHosts.includes(host) && pathParts.length > 0) {
        // LinkedIn URLs use /in/username format
        if (platform === 'linkedin' && pathParts[0] === 'in' && pathParts[1]) {
          return pathParts[1].replace(/^@/, '')
        }
        // YouTube can be /c/channel, /channel/id, or /@handle
        if (platform === 'youtube') {
          if (pathParts[0] === 'c' && pathParts[1]) return pathParts[1]
          if (pathParts[0] === 'channel' && pathParts[1]) return pathParts[1]
        }
        return pathParts[0].replace(/^@/, '')
      }
      // If the host doesn't match but it's a URL, take the last meaningful path part
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1].replace(/^@/, '')
      }
    } catch {
      // Not a valid URL, fall through
    }
  }

  // Strip leading @ symbol
  return v.replace(/^@/, '')
}

export { extractHandle }

export function SocialIconsRow({ socialLinks, size = 18, gap = 8, alwaysShow = false }) {
  const [hoveredPlatform, setHoveredPlatform] = useState(null)

  const links = (socialLinks && typeof socialLinks === 'object') ? socialLinks : {}
  const entries = PLATFORM_ORDER
    .filter(p => links[p] && links[p].trim())
    .map(p => [p, links[p]])

  if (entries.length === 0 && !alwaysShow) return null

  if (entries.length === 0 && alwaysShow) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap, minHeight: size + 4 }}>
        {PLATFORM_ORDER.slice(0, 4).map(platform => {
          const config = PLATFORMS[platform]
          return (
            <span
              key={platform}
              style={{
                color: 'var(--text-tertiary, #9CA3AF)',
                opacity: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={`No ${config.label} linked`}
            >
              {config.icon(size)}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      {entries.map(([platform, handle]) => {
        const config = PLATFORMS[platform]
        if (!config) return null
        const isHovered = hoveredPlatform === platform
        return (
          <a
            key={platform}
            href={config.url(handle)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`${config.label}: @${handle}`}
            onMouseEnter={() => setHoveredPlatform(platform)}
            onMouseLeave={() => setHoveredPlatform(null)}
            style={{
              color: isHovered ? config.color : 'var(--text-tertiary, #9CA3AF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s, transform 0.2s',
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              textDecoration: 'none'
            }}
          >
            {config.icon(size)}
          </a>
        )
      })}
    </div>
  )
}

export { PLATFORMS, PLATFORM_ORDER }
