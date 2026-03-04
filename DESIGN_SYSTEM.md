# Design System — irlwork.ai

## Typography Scale (Mobile-First)

All sizes use `base = mobile`, `sm: = 640px+`, `lg: = 1024px+`.

| Element | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|---------------------|
| Page title (h1) | 22px, font-semibold | 26px | 28-30px, font-bold |
| Section heading (h2) | 18px, font-semibold | 20px | 22px |
| Card title (h3) | 15px, font-medium | 15px | 15px |
| Body text | 14px | 14px | 14px |
| Secondary/helper text | 12-13px | 13px | 14px |
| Stat numbers | 20px, font-bold | 24px | 24px |
| Stat labels | 12px, text-gray-500 | 13px | 13px |
| Button text | 14px, font-medium | 14px | 14px |
| Nav tab text | 13px | 13px | 14px |
| Bottom nav label | 10px, font-medium | n/a | n/a |
| Input labels | 13px, font-medium | 14px | 14px |
| Input placeholder | 14px | 14px | 14px |

## Spacing Scale (Mobile-First)

| Element | Mobile (< 640px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|
| Page padding (horizontal) | 16px (px-4) | 24-32px |
| Page title margin-bottom | 12-16px | 20-24px |
| Card padding | 16px | 20-24px |
| Section gap | 16px | 24px |
| Bottom nav safe area | pb-20 (80px) + env(safe-area-inset-bottom) | n/a |

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FAFAF8` | Page background (warm off-white) |
| `--bg-secondary` | `#FFFFFF` | Card/surface background |
| `--bg-tertiary` | `#F5F3F0` | Input backgrounds, muted surfaces |
| `--text-primary` | `#1A1A1A` | Headlines, primary text |
| `--text-secondary` | `#333333` | Body text |
| `--text-tertiary` | `#888888` | Helper text, labels |
| `--accent-orange` | `#E8853D` | Primary CTA, active states |
| `--accent-orange-hover` | `#D4703A` | Hover state for orange |
| `--accent-orange-light` | `#FFF3EB` | Orange tint backgrounds |
| `--success` | `#16A34A` | Success states |
| `--status-red` | `#FF5F57` | Error/danger |
| `--status-yellow` | `#FEBC2E` | Warning |
| `--status-blue` | `#3B82F6` | Info |

## Fonts

- **Display/Body**: DM Sans
- **Monospace**: DM Mono, Courier Prime

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, small elements |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 14px | Cards |
| `--radius-xl` | 20px | Large containers |

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.04)` |
| `--shadow-md` | `0 1px 4px rgba(0, 0, 0, 0.02), 0 8px 40px rgba(0, 0, 0, 0.035)` |
| `--shadow-lg` | `0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)` |

## Component Patterns

### Buttons
- Standard height: 44px (touch target minimum)
- Primary (orange): ONE per screen, 14px font-medium, border-radius 10px
- Secondary: ghost/outline for secondary actions
- Compact: 36px height for inline/card actions

### Card (`ui/src/components/ui/Card.jsx`)

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | string | `'default'` | Visual style variant |
| `interactive` | boolean | `false` | Enables hover effect and cursor pointer |
| `hoverEffect` | string | `'shadow'` | Hover style (only applies when `interactive` is true) |
| `padding` | string | `'md'` | Internal padding |
| `dark` | boolean | `false` | Dark background mode |
| `className` | string | `''` | Additional CSS classes |

**Variants:**

| Variant | Background | Border |
|---------|------------|--------|
| `default` | white | `#ECECEC` + subtle shadow |
| `accent` | `#FFF7ED` (warm orange tint) | `#FDBA74` |
| `success` | `#F0FDF4` (green tint) | `#BBF7D0` |
| `info` | `#EFF6FF` (blue tint) | `#BFDBFE` |
| `warning` | `#FEFCE8` (yellow tint) | `#FDE68A` |
| `muted` | `#F3F4F6` (gray tint) | `#E5E7EB` |

**Hover effects** (require `interactive`):

| Effect | Behavior |
|--------|----------|
| `shadow` | Deepens box shadow on hover |
| `lift` | Translates up 2px + shadow |
| `glow` | Orange-tinted glow shadow |
| `border` | Border transitions to orange |

**Padding sizes:**

| Size | Value |
|------|-------|
| `none` | 0 |
| `sm` | 12px (p-3) |
| `md` | 20px (p-5) |
| `lg` | 24px (p-6) |

Base styles: border-radius 14px, 1px border. Default behavior (no new props) is identical to previous Card output.

### StatCard (`ui/src/components/ui/StatCard.jsx`)

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Uppercase label text |
| `value` | string/number | - | Large display value (DM Mono) |
| `icon` | ReactNode | - | Icon element |
| `trend` | string or object | - | Trend indicator (see below) |
| `dark` | boolean | `false` | Dark background mode |
| `iconColor` | string | `'gray'` | Icon color with optional background circle |
| `size` | string | `'md'` | Overall size variant |

**Icon colors:**

| Color | Text | Background circle |
|-------|------|-------------------|
| `gray` | `#9CA3AF` | None (flat icon) |
| `orange` | `#E8853D` | `#FFF7ED` |
| `green` | `#16A34A` | `#F0FDF4` |
| `blue` | `#2563EB` | `#EFF6FF` |
| `red` | `#DC2626` | `#FEF2F2` |
| `gold` | `#D4A017` | `#FEF9E7` |

When `iconColor` is not `gray`, the icon is wrapped in a colored circle.

**Sizes:**

| Size | Value text | Label text | Card padding |
|------|------------|------------|--------------|
| `sm` | 16px | 10px | p-3 |
| `md` | 24px | 12px | p-5 |
| `lg` | 32px | 14px | p-6 |

**Trend prop:** Accepts a simple string (`'up'`, `'down'`, `'flat'`) or an object `{ direction: 'up'|'down'|'flat', value: string, period: string }`. The object form displays value and period text alongside the directional arrow.

### StatusPill (`ui/src/components/ui/StatusPill.jsx`)

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | string | - | Status key for color mapping |
| `size` | string | `'md'` | Size variant |
| `color` | object | - | Custom color override `{ bg, text }` |
| `children` | ReactNode | - | Custom label (overrides `formatStatus(status)`) |

**Supported statuses:**

| Status | Style |
|--------|-------|
| `open`, `assigned`, `accepted`, `applied` | Blue |
| `in_progress`, `pending`, `refunded` | Amber |
| `pending_review`, `pending_acceptance`, `in_review` | Purple |
| `approved`, `completed`, `paid`, `new`, `resolved` | Green |
| `disputed`, `rejected`, `overdue` | Red |
| `cancelled`, `expired`, `dismissed` | Gray |

**Sizes:**

| Size | Font | Padding |
|------|------|---------|
| `sm` | 10px | px-2 py-0.5 |
| `md` | 12px (text-xs) | px-2.5 py-1 |
| `lg` | 14px (text-sm) | px-3 py-1.5 |

**Custom color override:**
```jsx
<StatusPill status="custom" color={{ bg: '#FEF9E7', text: '#D4A017' }}>Premium</StatusPill>
```

When `children` is provided, it renders instead of the auto-formatted status label.

### Empty States
- Icon: 48px, muted color
- Heading: 18px, font-semibold
- Description: 14px, text-gray-500, max-width 280px, centered
- Optional CTA: ghost button (not orange unless only action on page)
- Copy is context-aware: different for Hiring vs Working mode

### Form Inputs
- Height: 44px
- Font: 14px
- Label: 13-14px, font-medium, mb-1
- Border: 1px solid rgba(0,0,0,0.08), rounded-[10px]
- Focus ring: orange accent

### Tab Bars / Filter Rows
- Font: 13px
- Active: orange text + orange bottom border (2px)
- Horizontal scroll on overflow (never wrap)
- Tab padding: px-3 py-2

### Bottom Navigation (Mobile Only)
- Height: 56-64px + safe area inset
- Fixed to bottom, z-index 9980
- Solid background with top shadow
- Icon: 22px, label: 10px
- Active: orange icon + label
- Visible at <= 900px viewport width

### Dark variant

All shared components in `ui/src/components/ui/` accept a `dark` boolean prop (default `false`) for use on dark backgrounds. When `dark` is not passed, components render identically to their original behavior.

Dark styles use white with opacity for text and surfaces (`text-white/60`, `bg-white/5`, `border-white/10`) rather than introducing new color tokens.

| Component | Dark prop | Changes |
|-----------|----------|---------|
| Card | `<Card dark>` | bg-white/5, border-white/10, no shadow. Interactive: hover:bg-white/10 |
| Button | `<Button dark variant="secondary">` | secondary: white text/borders with opacity. ghost: text-white/60, hover:bg-white/10. primary/destructive: unchanged |
| StatCard | `<StatCard dark>` | White text, label at 60% opacity, wraps dark Card |
| PageHeader | `<PageHeader dark>` | White title, subtitle at 60% opacity |
| EmptyState | `<EmptyState dark>` | White text, icon/description at 40-60% opacity |
| ConfirmDialog | `<ConfirmDialog dark>` | bg-[#1A1A1A], border-white/10, white text, passes dark to inner Buttons |
| StatusPill | No change needed | Colored backgrounds work on both light and dark |

## CSS Architecture

- Design tokens: `ui/src/landing-v4.css` `:root` block
- Tailwind config: `ui/tailwind.config.cjs`
- Component styles: CSS classes in `ui/src/landing-v4.css`
- Responsive breakpoints: 640px (mobile), 768px (tablet), 900px (dashboard mobile), 1024px (desktop)

---

## Copy & Tone

### Voice
Direct. Warm. Not corporate, not playful. Like a calm colleague who respects your time.

- Write like a human, not a system
- Be specific, not vague
- Respect the reader's intelligence — don't over-explain
- Never use exclamation marks in UI copy (save them for success toasts, if at all)

### Reference: Anthropic's Claude UI
Our tone benchmark. Notice how their copy:
- Uses plain, declarative sentences
- Avoids jargon and marketing language
- Keeps modals/popups non-invasive — clear heading, short explanation, obvious actions
- Never shouts — no exclamation marks, no ALL CAPS, no emoji in core UI

### Rules

| Rule | Do | Don't |
|------|-----|-------|
| Case | Sentence case for everything (headings, buttons, labels, tabs) | Title Case For Headings, ALL CAPS |
| Person | Second person ("Your tasks", "You haven't…") | Third person ("User's tasks", "The user hasn't…") |
| Button labels | Verb + noun ("Create task", "Browse humans", "View details") | Single vague words ("Submit", "Go", "OK") |
| Empty states | "[Thing] will appear here when [action]" | "No data found" / "Nothing to show" / "Oops!" |
| Error messages | Say what happened + what to do ("Payment failed. Check your card details and try again.") | Blame the user ("Invalid input") or be vague ("Something went wrong") |
| Confirmations | State the outcome ("Task posted. Workers can now apply.") | Generic ("Success!" / "Done!") |
| Loading states | "[Thing] loading…" or skeleton | Spinner with no context |
| Modals/Dialogs | Clear heading (what is this?), 1-2 sentence explanation, obvious primary + secondary action | Walls of text, ambiguous buttons ("OK" / "Cancel" when it's unclear what "OK" does) |
| Technical terms | Plain language in worker-facing pages. Technical only on agent/API pages | Mixing audiences ("Your webhook endpoint" on a worker's dashboard) |
| Numbers | Use `DM Mono` for all prices, stats, IDs, wallet addresses | Body font for numbers |
| Emoji | Never in core UI (buttons, headings, labels, nav). Only in empty-state illustrations or user-generated content | Emoji in headings, buttons, flag emoji for countries |
| Product terms | "irlwork" (lowercase i), "Premium" (capitalized) | "IRLWork", "IRLWORK", "premium" |

### Empty State Formula

Every empty state follows this pattern — no exceptions:

```
[Centered icon or illustration]
[Title — what's missing, in 3-6 words]
[Description — one sentence explaining when content will appear]
[Single primary CTA button]
```

Examples:
- **My tasks (hiring):** Icon → "No tasks yet" → "Posted tasks will appear here once you create one." → [Create task]
- **Messages:** Icon → "No messages yet" → "Conversations with workers will appear here." → [Browse humans]
- **Payments:** Icon → "No transactions yet" → "Payment history will appear once you complete a task." → (no CTA, or [Browse tasks])
- **Applications:** Icon → "No applications yet" → "Worker applications will appear when someone applies to your task." → (no CTA)

### Heading Hierarchy per Page

Every page should follow this structure:

```
Page title (24px, DM Sans 600)           ← What page is this?
Optional subtitle (14px, #6B7280)        ← Brief context if needed
─────────────────────────────────────
Content                                   ← Cards, lists, forms, etc.
```

- Page titles are sentence case, never have a period
- Subtitles are optional — only when the page title alone isn't clear enough
- No greeting ("Good afternoon, Alex") on sub-pages — only on the Dashboard
