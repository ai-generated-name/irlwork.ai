# humanwork.ai — Category Icons

| Category | Icon | Emoji | Color Code |
|----------|------|-------|------------|
| Plumbing | 🔧 | wench | `#3B82F6` |
| Electrical | ⚡ | lightning | `#F59E0B` |
| Cleaning | 🧹 | broom | `#10B981` |
| Moving | 📦 | package | `#8B5CF6` |
| Delivery | 📨 | envelope | `#EC4899` |
| Pickup | 🚗 | car | `#6366F1` |
| Errands | 🏃 | runner | `#14B8A6` |
| Assembly | 🪑 | chair | `#F97316` |
| Photography | 📸 | camera | `#64748B` |
| Handyman | 🔨 | hammer | `#78716C` |
| HVAC | ❄️ | snowflake | `#0EA5E9` |
| Pet Care | 🐕 | dog | `#A855F7` |
| Landscaping | 🌳 | tree | `#22C55E` |
| Other | ✨ | sparkles | `#94A3B8` |

---

## Icon Usage Guidelines

### CSS Classes
```css
.category-plumbing { color: #3B82F6; }
.category-electrical { color: #F59E0B; }
.category-cleaning { color: #10B981; }
.category-moving { color: #8B5CF6; }
.category-delivery { color: #EC4899; }
.category-pet { color: #A855F7; }
.category-photography { color: #64748B; }
.category-handyman { color: #78716C; }
```

### Tailwind Classes
```jsx
<span className="text-blue-500">🔧</span>  {/* Plumbing */}
<span className="text-amber-500">⚡</span> {/* Electrical */}
<span className="text-emerald-500">🧹</span> {/* Cleaning */}
<span className="text-purple-500">📦</span> {/* Moving */}
<span className="text-pink-500">📨</span> {/* Delivery */}
<span className="text-purple-600">🐕</span> {/* Pet Care */}
```

---

## Demand Badges

```jsx
// Very High Demand
<span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
  Very High Demand
</span>

// High Demand
<span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
  High Demand
</span>

// Medium Demand
<span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
  Medium Demand
</span>
```

---

## Rate Ranges (for display)

| Category | Min Rate | Max Rate | Display |
|----------|----------|----------|---------|
| Plumbing | $45 | $80 | "$45-80/hr" |
| Electrical | $50 | $100 | "$50-100/hr" |
| Photography | $75 | $150 | "$75-150/hr" |
| Pet Care | $25 | $45 | "$25-45/hr" |
| Moving | $30 | $55 | "$30-55/hr" |
| Cleaning | $22 | $40 | "$22-40/hr" |
| Delivery | $18 | $30 | "$18-30/hr" |
| Handyman | $35 | $65 | "$35-65/hr" |
