import React from 'react';
import { Search, Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList, Sparkles, Truck, Dumbbell } from 'lucide-react'

const TASK_CATEGORIES = [
  { value: '', label: 'All', icon: <Search size={16} /> },
  { value: 'delivery', label: 'Delivery', icon: <Package size={16} /> },
  { value: 'photography', label: 'Photography', icon: <Camera size={16} /> },
  { value: 'data_collection', label: 'Data Collection', icon: <BarChart3 size={16} /> },
  { value: 'errands', label: 'Errands', icon: <Footprints size={16} /> },
  { value: 'cleaning', label: 'Cleaning', icon: <Sparkles size={16} /> },
  { value: 'moving', label: 'Moving', icon: <Truck size={16} /> },
  { value: 'manual_labor', label: 'Manual Labor', icon: <Dumbbell size={16} /> },
  { value: 'inspection', label: 'Inspection', icon: <Search size={16} /> },
  { value: 'tech', label: 'Tech', icon: <Monitor size={16} /> },
  { value: 'translation', label: 'Translation', icon: <Globe size={16} /> },
  { value: 'verification', label: 'Verification', icon: <CheckCircle size={16} /> },
  { value: 'general', label: 'General', icon: <ClipboardList size={16} /> },
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
