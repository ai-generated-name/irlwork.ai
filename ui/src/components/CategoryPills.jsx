import React from 'react';
import { Search, Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList } from 'lucide-react'

const TASK_CATEGORIES = [
  { value: '', label: 'All', icon: <Search size={14} /> },
  { value: 'delivery', label: 'Delivery', icon: <Package size={14} /> },
  { value: 'photography', label: 'Photography', icon: <Camera size={14} /> },
  { value: 'data-collection', label: 'Data Collection', icon: <BarChart3 size={14} /> },
  { value: 'errands', label: 'Errands', icon: <Footprints size={14} /> },
  { value: 'tech-setup', label: 'Tech Setup', icon: <Monitor size={14} /> },
  { value: 'translation', label: 'Translation', icon: <Globe size={14} /> },
  { value: 'verification', label: 'Verification', icon: <CheckCircle size={14} /> },
  { value: 'other', label: 'Other', icon: <ClipboardList size={14} /> },
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
