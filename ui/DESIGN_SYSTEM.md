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
| `no-orange-outside-button` | `#E8853D` or `#D4742E` used outside the `Button` component and shared UI components | warn |
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
<div className="h-1 bg-[#E8853D]" />
```

### Copy and tone

- **Sentence case** for all UI text: "Create a task", not "Create A Task".
- **No exclamation marks** in user-facing copy.
- **No emoji** in rendered text; use [lucide-react](https://lucide.dev/icons/) icons.
- Allowed uppercase words: API, URL, AI, CTA, MCP, USDC, USD, FAQ, OAuth, SSO, ID, UI, UX.
- Allowed Title Case phrases: Privacy Policy, Terms of Service, Terms and Conditions, Stripe Connect.
