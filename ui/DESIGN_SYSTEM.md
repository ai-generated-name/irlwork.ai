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
| `no-inline-card-pattern` | `<div>` with Card-like Tailwind classes (`bg-white` + `rounded-xl`/`rounded-[20px]` + `border`/`shadow`) | warn |
| `no-inline-button-pattern` | `<button>` with inline background color, text color, and border-radius styling | warn |
| `no-orange-outside-button` | `#E8703D` or `#E8853D` used outside the `Button` component and shared UI components | warn |
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
<div className="h-1 bg-[#E8703D]" />
```

### Copy and tone

- **Sentence case** for all UI text: "Create a task", not "Create A Task".
- **No exclamation marks** in user-facing copy.
- **No emoji** in rendered text; use [lucide-react](https://lucide.dev/icons/) icons.
- Allowed uppercase words: API, URL, AI, CTA, MCP, USDC, USD, FAQ, OAuth, SSO, ID, UI, UX.
- Allowed Title Case phrases: Privacy Policy, Terms of Service, Terms and Conditions, Stripe Connect.

---

---

## v16 Token Reference (2026-03-05)

### Fonts
| Token | Family | Usage |
|-------|--------|-------|
| `--font-sans` / `font-sans` | Sora (300-800) | All UI text, headings, buttons, labels |
| `--font-mono-v9` / `font-mono` | JetBrains Mono (400, 500) | Task IDs, timestamps, prices, code |
| `--font-courier` / `font-courier` | Courier Prime Bold | `irlwork` wordmark ONLY — never elsewhere |

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#FAFAF8` | Page background |
| `--surface` | `#FFFFFF` | Card/panel background |
| `--ink` | `#1A1410` | Primary text |
| `--ink2` | `rgba(26,20,16,0.50)` | Secondary text |
| `--ink3` | `rgba(26,20,16,0.28)` | Muted text, labels, light elements |
| `--orange` | `#E8703D` | Pay amounts, primary CTA, open status |
| `--orange-bg` | `#FDEEE6` | Orange pill/accent backgrounds |
| `--orange-soft` | `#F0905A` | Gradient start for CTA buttons |
| `--orange-glo` | `rgba(232,112,61,0.18)` | Orange glow shadow |
| `--green` | `#1A9E6A` | Assigned, in-progress, completed, paid status |
| `--green-bg` | `rgba(26,158,106,0.09)` | Green pill backgrounds |
| `--green-border` | `rgba(26,158,106,0.18)` | Green pill/card borders |
| `--purple` | `#6D4FC2` | In-review, submitted status |
| `--purple-bg` | `rgba(109,79,194,0.09)` | Purple pill backgrounds |
| `--purple-border` | `rgba(109,79,194,0.18)` | Purple pill/card borders |
| `--red` | `#c4420a` | Error, disputed status |
| `--red-bg` | `rgba(196,66,10,0.08)` | Red pill backgrounds |
| `--gold` | `#D4A017` | Ratings, premium, warnings |
| `--gold-bg` | `rgba(212,160,23,0.08)` | Gold pill backgrounds |
| `--border` | `rgba(220,200,180,0.35)` | Default warm border |
| `--border-md` | `rgba(220,200,180,0.50)` | Medium-emphasis border |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--r` | `20px` | Cards, large containers |
| `--r-sm` | `11px` | Inputs, small elements |
| `--r-pill` | `30px` | Pills, tags, status badges |

### Shadows (warm tone)
| Token | Value |
|-------|-------|
| `--shadow-card` | `0 4px 24px rgba(200,150,100,0.08), 0 1px 0 rgba(255,255,255,0.9) inset` |
| `--shadow-cta` | `0 8px 32px rgba(232,112,61,0.22), 0 1px 0 rgba(255,255,255,0.25) inset` |

### Glass effects
| Token | Value | Usage |
|-------|-------|-------|
| `--glass` | `rgba(255,255,255,0.65)` | Light glass |
| `--glass-md` | `rgba(255,255,255,0.80)` | Medium glass (inputs) |
| `--glass-hi` | `rgba(255,255,255,0.92)` | High glass (sheets, modals) |
| `--blur` | `blur(20px)` | Backdrop blur for all glass |

### CTA Button
```css
background: linear-gradient(135deg, #F0905A 0%, #E8703D 100%);
box-shadow: 0 8px 32px rgba(232,112,61,0.22), 0 1px 0 rgba(255,255,255,0.25) inset;
border-radius: 20px;
font-weight: 700;
```
**Rule**: ONE orange CTA per screen maximum.

### Status Badge (pill style)
```css
border-radius: 30px;
padding: 3px 9px;
font-size: 10px;
font-weight: 600;
/* 5px colored dot before label */
```
Three-color system:
- **Orange** (`#E8703D` / `#FDEEE6`): open, awaiting_worker
- **Green** (`#1A9E6A` / green-bg): assigned, in_progress, completed, paid
- **Purple** (`#6D4FC2` / purple-bg): in_review, submitted

### Orange usage rules
Orange (`#E8703D`) is allowed ONLY in:
- Pay/budget amounts (`$15`, `$32`)
- Primary CTA button (one per screen)
- Urgent action buttons (Approve, Review)
- Notification badge count
- Logo cursor `|`
- "Open" status pill

Orange is **NOT** allowed in: mode toggle, user avatar, attention card borders, worker status badges, activity icons, section headings, non-money stat values.

**Note**: Sidebar nav and bottom nav active states use orange text + `rgba(232,112,61,0.08)` background.

### Section labels
```css
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.08em;
color: var(--ink3);
```

---

## Changelog

### 2026-03-05 — v16 design system (full migration)

- **Sidebar nav active**: Changed from ink to orange text + `rgba(232,112,61,0.08)` bg
- **Marketing navbar**: Updated glass to `rgba(251,248,244,0.70)` with `blur(28px)` (was 0.92/blur(16px))
- **User dropdown menu**: Added glass treatment `rgba(255,255,255,0.92)` + `blur(20px)`
- **TierBadge**: Remapped to v16 pill style (orange for builder, purple for pro, 30px radius, 5px dot)
- **V4Layout fonts**: Updated from DM Sans to Sora across all sub-components
- **All CSS fallbacks**: Replaced remaining `DM Sans` fallbacks with `Sora` in index.css and landing-v4.css
- **ConfirmationModal**: Added glass background + 20px radius

### 2026-03-05 — v16 design system (initial)

- **Background**: Changed from `#F7F5F2` to `#FAFAF8`
- **Text colors**: Primary `#1A1410`, secondary `rgba(26,20,16,0.50)`, muted `rgba(26,20,16,0.28)`
- **Borders**: Warm translucent `rgba(220,200,180,0.35)` replacing cold `rgba(0,0,0,0.06)`
- **Border radius**: Cards 20px (was 16px), inputs/small 11px (was 10px), pills 30px (new)
- **Shadows**: Warm `rgba(200,150,100,...)` replacing grey `rgba(0,0,0,...)`
- **Glass effects**: Three tiers (glass, glassMd, glassHi) with 20px backdrop blur
- **CTA buttons**: Gradient `linear-gradient(135deg, #F0905A, #E8703D)` with warm shadow
- **Status green**: `#1A9E6A` (was `#16A071`)
- **Status purple**: `#6D4FC2` (was `#6B4FBF`)
- **Status red**: `#c4420a` (was `#FF5F57`)
- **Gold**: `#D4A017` for ratings/warnings
- **Inputs**: Glass background with backdrop blur, 11px radius
- **Toasts**: Dark background pill style (was white card style)
- **Animations**: Added irw-fadeIn, irw-slideUp, irw-pulse, irw-toast, irw-shimmer

### 2026-03-04 — v9 design system

- **Fonts**: Migrated from DM Sans/DM Mono to Sora + JetBrains Mono. Courier Prime reserved for wordmark only.
- **Color tokens**: Updated `--orange` to `#E8703D` (was `#E8853D`). Added v9 ink/surface/bg tokens.
- **Nav active states**: Mode toggle, sidebar nav, bottom nav active now use ink, not orange.
- **User avatars**: All avatar backgrounds changed from orange gradient to `var(--ink)`.
- **Task cards**: Selected state uses ink border (was orange). Card shell uses v9 surface/border tokens.
- **New components**: `TaskDocket`, `TaskProgress`, `WorkerAvatar`, `WorkingTaskRow`, `WorkingTaskList`.
- **Bottom nav**: Frosted glass background, ink active state, orange badge preserved for notification counts.
- **Tailwind config**: Added v9 token shorthands (`bg`, `surface`, `ink`, `ink2`, `ink3`, `orange`, `green`, `purple`, etc.).

### 2026-03-01 — Final hardening pass

- **Tailwind config**: Added convenience color tokens (page, surface, border-default, success, warning, error, info, gold) for easier adoption
- **Component README**: Created `src/components/ui/README.md` with usage guide and rules
- **CLAUDE.md**: Added UI/UX rules section with component and color system guidance

### 2026-03-01 — Visual QA pass

- **ProofSubmitModal**: Fixed undefined `user` reference in Authorization header (runtime bug)
- **MessagesTab**: Replaced emoji error icons with `AlertTriangle` from lucide-react; migrated retry and send buttons to `Button` component
- **ProfileTab**: Migrated all save/update buttons from `v4-btn` classes to `Button` component; removed 3 `console.log` statements; fixed 5 exclamation marks in toast messages
- **HiringDashboard**: Replaced inline-styled cards (checklist, activity, quick actions) with `Card` component; migrated quick action icon colors from `#F4845F` to design system `#E8853D`
- **HiringPaymentsTab**: Replaced inline stat divs with `Card` component; added `DM Mono` font for monetary values
- **SettingsTab**: Removed 2 `console.log` statements; fixed 4 exclamation marks in toast messages
- **PremiumPage**: Removed 5 debug `console.log` statements
- **HumanProfilePage**: Removed 1 `console.log` statement
- **Cleanup**: Deleted orphaned `mobile-fixes.css`; removed its `@import` from `index.css`
