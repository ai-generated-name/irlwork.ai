# Design System

Shared UI components live in `src/components/ui/`. Import them from the barrel export:

```jsx
import { Button, Card, StatCard, StatusPill, PageHeader, EmptyState, ConfirmDialog, PageLoader } from '../components/ui';
```

---

## Enforcement

These rules are enforced via ESLint (`eslint-plugin-irlwork`):

| Rule | What it catches | Severity |
|------|----------------|----------|
| `no-inline-card-pattern` | `<div>` with Card-like Tailwind classes (`bg-white` + `rounded-xl`/`rounded-[16px]` + `border`/`shadow`) | warn |
| `no-inline-button-pattern` | `<button>` with inline background color, text color, and border-radius styling | warn |
| `no-orange-outside-button` | `#E8764B` or `#D4683F` used outside the `Button` component and shared UI components | warn |
| `no-title-case-ui-strings` | "Browse All Tasks" instead of "Browse all tasks" (3+ consecutive Title Case words) | warn |
| `no-exclamation-in-ui` | "Success!" in UI text (exclamation marks in rendered JSX) | warn |
| `no-emoji-in-ui` | Emoji Unicode characters in JSX text (use lucide-react icons instead) | warn |

### Running the linter

```bash
# All ESLint rules
npm run lint

# UI consistency rules only
npm run lint:ui
```

### Suppressing a rule

If a violation is intentional, add an inline disable comment with an explanation:

```jsx
{/* eslint-disable-next-line irlwork/no-orange-outside-button -- accent line uses brand color intentionally */}
<div className="h-1 bg-[#E8764B]" />
```

### Copy and tone

- **Sentence case** for all UI text: "Create a task", not "Create A Task".
- **No exclamation marks** in user-facing copy.
- **No emoji** in rendered text; use [lucide-react](https://lucide.dev/icons/) icons.
- Allowed uppercase words: API, URL, AI, CTA, MCP, USDC, USD, FAQ, OAuth, SSO, ID, UI, UX.
- Allowed Title Case phrases: Privacy Policy, Terms of Service, Terms and Conditions, Stripe Connect.

---

## Design Philosophy

The irlwork visual identity is warm, grounded, and consumer-grade — it avoids cold tech aesthetics in favor of an approachable, physical-world feeling. The palette centers on earth tones (cream, warm orange, deep brown-black) with generous whitespace, bold geometric sans-serif type (Satoshi), and rounded components.

Core principles:
- Warm over cold (cream backgrounds, earth tones — never dark mode by default)
- Generous spacing over density
- Rounded over sharp (minimum 6px radius everywhere)
- Centered/symmetrical layouts for marketing pages; left-aligned for app/dashboard UI
- Subtle depth (light borders, soft shadows) over flat or heavy elevation
- One font family (Satoshi) across the entire product

---

## Token Reference (2026-03-06)

### Fonts
| Token | Family | Usage |
|-------|--------|-------|
| `--font-sans` / `font-sans` | Satoshi (300-900) | All UI text, headings, buttons, labels |
| `--font-mono` / `font-mono` | IBM Plex Mono (400, 500) | Task IDs, timestamps, prices, code, labels |

Font loading: Satoshi from `api.fontshare.com`, IBM Plex Mono from Google Fonts.

### Type Scale
| Token | Size | Weight | Letter Spacing | Usage |
|-------|------|--------|----------------|-------|
| `--text-display` | 48px / 3rem | 800 (Black) | -0.03em | Page titles |
| `--text-h2` | 24px / 1.5rem | 700 (Bold) | -0.02em | Section headings |
| `--text-h3` | 20px / 1.25rem | 600 (Semi) | -0.01em | Sub-section titles |
| `--text-body` | 16px / 1rem | 400 (Regular) | 0 | Body text |
| `--text-body-sm` | 14px / 0.875rem | 400 (Regular) | 0 | Secondary descriptions |
| `--text-caption` | 12px / 0.75rem | 500 (Medium) | 0.08em | Uppercase labels (IBM Plex Mono) |
| `--text-code` | 13px | 400 | 0 | Code blocks, endpoints |
| `--text-price` | 28px | 800 (Black) | -0.02em | Prices, amounts |
| `--text-ui` | 14px | 500 (Medium) | 0 | Buttons, nav items |

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` / `--bg` | `#FDF6EE` | Page background (warm cream) |
| `--color-bg-card` / `--surface` | `#FFFFFF` | Card/panel background |
| `--color-bg-code` | `#F5EFE7` | Inline code backgrounds, badge backgrounds |
| `--color-primary` / `--orange` | `#E8764B` | Primary buttons, active indicators, links |
| `--color-primary-hover` | `#D4683F` | Button hover state |
| `--color-primary-light` / `--orange-bg` | `#FDEEE7` | Light orange backgrounds |
| `--color-text` / `--ink` | `#1A1A1A` | Headings, primary body text |
| `--color-text-secondary` / `--ink2` | `#8C8580` | Subtitles, descriptions |
| `--color-text-tertiary` / `--ink3` | `#A69E98` | Metadata, muted content |
| `--color-border` / `--border` | `#E8E0D8` | Card borders, dividers |
| `--color-border-light` | `#F0EAE2` | Very subtle separators |
| `--color-success` / `--green` | `#2D7A3A` | Status dots, "live" indicators |
| `--color-error` / `--red` | `#D44B4B` | Error, disputed status |
| `--color-warning` / `--gold` | `#D4963F` | Warnings, ratings |
| `--purple` | `#6D4FC2` | In-review, submitted status |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Inline code, small tags |
| `--radius-md` | `10px` | Buttons (secondary), tabs, inner cards |
| `--radius-lg` | `12px` | Primary buttons, input fields |
| `--radius-xl` / `--r` | `16px` | Main cards, panels |
| `--radius-pill` | `9999px` | Badges, pills, toggles |

### Shadows
| Token | Value |
|-------|-------|
| `--shadow-card` | `0 1px 3px rgba(0, 0, 0, 0.04)` |
| `--shadow-elevated` | `0 4px 12px rgba(0, 0, 0, 0.06)` |

**Rule**: Cards use `1px solid #E8E0D8` borders, NOT box-shadows for depth.

### CTA Button
```css
background: #E8764B;
border-radius: 12px;
font-weight: 600;
/* No gradient, no shadow — solid flat color */
```
**Rule**: ONE orange CTA per screen maximum. Hover: `#D4683F`.

### Status Badge (pill style)
```css
border-radius: 9999px;
padding: 3px 9px;
font-size: 10px;
font-weight: 600;
/* Colored dot before label */
```
Three-color system:
- **Orange** (`#E8764B` / `#FDEEE7`): open, awaiting_worker
- **Green** (`#2D7A3A` / green-bg): assigned, in_progress, completed, paid
- **Purple** (`#6D4FC2` / purple-bg): in_review, submitted

### Orange usage rules
Orange (`#E8764B`) is allowed ONLY in:
- Pay/budget amounts
- Primary CTA button (one per screen)
- Urgent action buttons (Approve, Review)
- Notification badge count
- Logo cursor `|`
- "Open" status pill
- Text links

Orange is **NOT** allowed in: mode toggle, nav active state, user avatar, attention card borders, worker status badges, activity icons, section headings, non-money stat values.

### Section labels
```css
font-family: 'IBM Plex Mono', monospace;
font-size: 12px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.08em;
color: #8C8580;
```

---

## Spacing System

8px base grid:
| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Key spacing rules:
- Card internal padding: 32px
- Content max-width: 720px
- Page max-width: 1080px
- Between page sections: 48px-64px

---

## Anti-Patterns (What NOT to Do)

| Don't | Do Instead |
|-------|------------|
| Pure white `#FFF` page backgrounds | Warm cream `#FDF6EE` |
| Pure black `#000` text | Dark warm brown `#1A1A1A` |
| Box-shadows on cards | 1px border in `#E8E0D8` |
| Sharp corners (0px radius) | Minimum 6px radius everywhere |
| Blue links | Orange links using `#E8764B` |
| Gradient buttons | Solid flat `#E8764B` |
| Heavy drop shadows | Near-invisible shadows or borders only |
| Inter, Roboto, DM Sans, Sora, or system fonts | Satoshi everywhere (mono: IBM Plex Mono) |
| Multiple font families for hierarchy | Single font (Satoshi), hierarchy via weight + tracking |
| Underlined links | No underline, color + arrow only |

---

## Checklist for New Pages / Features

Before shipping any new page or component, verify:
- [ ] Page background is `#FDF6EE`, never `#FFFFFF`
- [ ] All text uses Satoshi (loaded from Fontshare CDN)
- [ ] Display headings use weight 800 with letter-spacing `-0.03em`
- [ ] H2 uses weight 700, H3 uses weight 600
- [ ] Body text uses weight 400, buttons use weight 600
- [ ] No serif fonts, no Inter, no DM Sans, no Sora, no Roboto anywhere
- [ ] Primary CTA is solid orange `#E8764B` with white text
- [ ] Cards use white bg + 1px `#E8E0D8` border + 16px radius
- [ ] Subtitle/description text uses `#8C8580`
- [ ] No sharp corners anywhere (min 6px radius)
- [ ] Code/endpoints use IBM Plex Mono
- [ ] Labels use uppercase + letter-spacing + monospace (IBM Plex Mono)
- [ ] Links are orange with arrow suffix
- [ ] Spacing follows 8px grid
- [ ] Interactive elements have hover transitions (0.2s ease)
- [ ] No heavy shadows (borders preferred)
- [ ] Mobile responsive with appropriate breakpoints
- [ ] Font is loading from `api.fontshare.com` (not Google Fonts for Satoshi)

---

## Changelog

### 2026-03-06 — Satoshi design system

- **Fonts**: Migrated from Sora + JetBrains Mono to Satoshi + IBM Plex Mono. Satoshi loaded from Fontshare CDN.
- **Background**: Changed from `#FAFAF8` to `#FDF6EE` (warmer cream)
- **Text colors**: Primary `#1A1A1A`, secondary `#8C8580`, tertiary `#A69E98`
- **Orange**: Updated from `#E8703D` to `#E8764B`, hover from `#D4622E` to `#D4683F`
- **Green**: Updated from `#1A9E6A` to `#2D7A3A`
- **Red**: Updated from `#c4420a` to `#D44B4B`
- **Borders**: Solid `#E8E0D8` replacing translucent `rgba(220,200,180,0.35)`
- **Border radius**: Cards 16px (was 20px), buttons 12px (was 20px), pills 9999px (was 30px)
- **Shadows**: Minimal `rgba(0,0,0,0.04)` replacing warm `rgba(200,150,100,...)`. Cards prefer borders over shadows.
- **CTA buttons**: Solid `#E8764B` replacing gradient `linear-gradient(135deg, #F0905A, #E8703D)`. No shadow.
- **Typography**: Satoshi weight 800 for display (-0.03em tracking), weight 600 for buttons, IBM Plex Mono for labels/code
- **Status pills**: Updated to 9999px radius (full pill), updated color values

### 2026-03-05 — v16 design system

- **Background**: Changed from `#F7F5F2` to `#FAFAF8`
- **Borders**: Warm translucent `rgba(220,200,180,0.35)` replacing cold `rgba(0,0,0,0.06)`
- **Border radius**: Cards 20px (was 16px), inputs/small 11px (was 10px), pills 30px (new)
- **Glass effects**: Three tiers with backdrop blur
- **CTA buttons**: Gradient with warm shadow

### 2026-03-04 — v9 design system

- **Fonts**: Migrated from DM Sans/DM Mono to Sora + JetBrains Mono. Courier Prime reserved for wordmark only.
