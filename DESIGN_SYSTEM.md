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

### Cards
- Padding: 16px on mobile, 20-24px on desktop
- Border-radius: 14px
- Background: white on off-white page
- Minimal borders: `1px solid rgba(0, 0, 0, 0.06)`

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

## CSS Architecture

- Design tokens: `ui/src/landing-v4.css` `:root` block
- Tailwind config: `ui/tailwind.config.cjs`
- Component styles: CSS classes in `ui/src/landing-v4.css`
- Responsive breakpoints: 640px (mobile), 768px (tablet), 900px (dashboard mobile), 1024px (desktop)
