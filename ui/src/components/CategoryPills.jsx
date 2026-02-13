import React from 'react';
import { Search, Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList } from 'lucide-react'

const TASK_CATEGORIES = [
  { value: '', label: 'All', icon: '🔍' },
  { value: 'delivery', label: 'Delivery', icon: '📦' },
  { value: 'photography', label: 'Photography', icon: '📸' },
  { value: 'data_collection', label: 'Data Collection', icon: '📊' },
  { value: 'errands', label: 'Errands', icon: '🏃' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'moving', label: 'Moving', icon: '🚚' },
  { value: 'manual_labor', label: 'Manual Labor', icon: '💪' },
  { value: 'inspection', label: 'Inspection', icon: '🔍' },
  { value: 'tech', label: 'Tech', icon: '💻' },
  { value: 'translation', label: 'Translation', icon: '🌐' },
  { value: 'verification', label: 'Verification', icon: '✅' },
  { value: 'general', label: 'General', icon: '📋' },
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
