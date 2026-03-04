# Shared Component Library

Import from the barrel export:
```jsx
import { Card, Button, EmptyState, StatusPill, StatCard, PageHeader, ConfirmDialog } from '../components/ui';
```

## Quick reference

| Need this? | Use this |
|-----------|---------|
| White content box | `<Card>` |
| Clickable content box | `<Card interactive>` |
| Orange primary action | `<Button variant="primary">` (ONE per page) |
| Secondary action | `<Button variant="secondary">` |
| Subtle/tertiary action | `<Button variant="ghost">` |
| Delete/destructive action | `<Button variant="destructive">` |
| No data yet | `<EmptyState icon={} title="" description="" />` |
| Task/application status | `<StatusPill status="open" />` |
| Metric/stat display | `<StatCard label="" value="" />` |
| Page title | `<PageHeader title="" />` |
| Confirmation modal | `<ConfirmDialog title="" description="" />` |
| Any of the above on dark bg | Add `dark` prop |

## Rules

- **ONE** `<Button variant="primary">` per page (the orange rule)
- Every empty/no-data state uses `<EmptyState>`
- Every page heading uses `<PageHeader>`
- Sentence case for all text
- No emoji in UI strings
- Prices/stats/IDs in DM Mono (`<StatCard>` handles this automatically)

See `DESIGN_SYSTEM.md` for full specifications.
