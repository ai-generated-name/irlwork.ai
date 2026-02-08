import React from 'react';

const TASK_CATEGORIES = [
  { value: '', label: 'All', icon: '🔍' },
  { value: 'delivery', label: 'Delivery', icon: '📦' },
  { value: 'photography', label: 'Photography', icon: '📸' },
  { value: 'data-collection', label: 'Data Collection', icon: '📊' },
  { value: 'errands', label: 'Errands', icon: '🏃' },
  { value: 'tech-setup', label: 'Tech Setup', icon: '💻' },
  { value: 'translation', label: 'Translation', icon: '🌐' },
  { value: 'verification', label: 'Verification', icon: '✅' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export default function CategoryPills({
  selected = '',
  onChange = () => {},
  categories = TASK_CATEGORIES,
}) {
  return (
    <div className="category-pills">
      {categories.map(cat => (
        <button
          key={cat.value}
          className={`category-pill ${selected === cat.value ? 'active' : ''}`}
          onClick={() => onChange(cat.value)}
          type="button"
        >
          <span className="category-pill-icon">{cat.icon}</span>
          <span className="category-pill-label">{cat.label}</span>
        </button>
      ))}
    </div>
  );
}

export { TASK_CATEGORIES };
