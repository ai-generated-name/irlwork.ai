# Design System

Shared UI components live in `src/components/ui/`. Import them from the barrel export:

```jsx
import { Button, Card, StatCard, StatusPill, PageHeader, EmptyState, ConfirmDialog, PageLoader } from '../components/ui';
```

See `REDESIGN_V4.md` for color palette, typography, and layout guidance.

---

## Enforcement

These rules are enforced via ESLint (`eslint-plugin-irlwork`):

| Rule | What it catches | Severity |
|------|----------------|----------|
| `no-inline-card-pattern` | `<div>` with Card-like Tailwind classes (`bg-white` + `rounded-xl`/`rounded-[14px]` + `border`/`shadow`) | warn |
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

## v9 Token Reference (2026-03-04)

### Fonts
| Token | Family | Usage |
|-------|--------|-------|
| `--font-sans` / `font-sans` | Sora | All UI text, headings, buttons, labels |
| `--font-mono-v9` / `font-mono` | JetBrains Mono | Status labels, timestamps, agent source tags, progress labels, code |
| `--font-courier` / `font-courier` | Courier Prime Bold | `irlwork` wordmark ONLY — never elsewhere |

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F7F5F2` | Page background |
| `--surface` | `#FFFFFF` | Card/panel background |
| `--ink` | `#111010` | Primary text, active nav, avatars, attention borders |
| `--ink2` | `rgba(17,16,16,0.46)` | Secondary text |
| `--ink3` | `rgba(17,16,16,0.26)` | Muted text, labels, inactive nav |
| `--orange` | `#E8703D` | Pay amounts, primary CTA, urgent actions, notification badge, logo cursor, open status pill |
| `--orange-bg` | `#FEF1EA` | Orange pill backgrounds |
| `--orange-glo` | `rgba(232,112,61,0.18)` | Orange button glow shadow |
| `--green` | `#16A071` | In-progress status, active worker badges |
| `--green-bg` | `rgba(22,160,113,0.08)` | Green pill backgrounds |
| `--purple` | `#6B4FBF` | Review/pending status |
| `--purple-bg` | `rgba(107,79,191,0.08)` | Purple pill backgrounds |
| `--border` | `rgba(0,0,0,0.06)` | Default card/element border |
| `--border-md` | `rgba(0,0,0,0.10)` | Medium-emphasis border |
| `--r` | `16px` | Default border radius |
| `--r-sm` | `10px` | Small border radius |

### Orange usage rules
Orange (`#E8703D`) is allowed ONLY in:
- Pay/budget amounts (`$15`, `$32`)
- Primary CTA button (one per screen)
- Urgent action buttons (Approve, Review)
- Notification badge count
- Logo cursor `|`
- "Open" status pill

Orange is **NOT** allowed in: mode toggle, nav active state, user avatar, attention card borders, worker status badges, activity icons, section headings, non-money stat values.

### New components (v9)
- `TaskDocket` — docket strip replacing task ID header, shows status dot + source tag
- `TaskProgress` — fill-bar progress (not numbered circles)
- `WorkerAvatar` — gradient avatar keyed on name initial (`avatarGradient.js`)
- `WorkingTaskRow` / `WorkingTaskList` — dense row layout for Working mode

---

## Changelog

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
