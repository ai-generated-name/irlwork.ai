"use client";

import { motion } from "framer-motion";
import { Truck, Package, Footprints, Wrench } from "lucide-react";

interface TaskTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

const taskTypes = [
  {
    type: "standard",
    label: "Standard",
    icon: null,
    description: "General tasks that don't fit other categories",
  },
  {
    type: "delivery",
    label: "Delivery",
    icon: Truck,
    description: "Deliver packages, food, or items from one location to another",
  },
  {
    type: "pickup",
    label: "Pickup",
    icon: Package,
    description: "Pick up items from a location and bring them to you",
  },
  {
    type: "errand",
    label: "Errand",
    icon: Footprints,
    description: "Run personal errands like grocery shopping, returns, or appointments",
  },
  {
    type: "assembly",
    label: "Assembly",
    icon: Wrench,
    description: "Assemble furniture, equipment, or other items",
  },
];

export function TaskTypeSelector({ value, onChange }: TaskTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Task Type
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {taskTypes.map((taskType) => {
          const Icon = taskType.icon;
          const isSelected = value === taskType.type;

          return (
            <motion.button
              key={taskType.type}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(taskType.type)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-[#ff4d00] bg-[#ff4d00]/10"
                  : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#ff4d00]/50"
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#ff4d00] rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
              {Icon && (
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#ff4d00]" />
                </div>
              )}
              <h4 className="font-semibold text-white">{taskType.label}</h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {taskType.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function getTaskTypeIcon(type: string) {
  const iconMap: Record<string, string> = {
    delivery: "🚗",
    pickup: "📦",
    errand: "🏃",
    assembly: "🔧",
    standard: "📋",
  };
  return iconMap[type] || "📋";
}

export function getTaskTypeColor(type: string) {
  const colorMap: Record<string, string> = {
    delivery: "#ff4d00",
    pickup: "#00ff9d",
    errand: "#ff00ff",
    assembly: "#00ffff",
    standard: "#888888",
  };
  return colorMap[type] || "#888888";
}
