"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Package, DollarSign, Truck, Footprints, Wrench } from "lucide-react";
import { getTaskTypeIcon, getTaskTypeColor } from "./TaskTypeSelector";

interface TaskCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    taskType?: string;
    priority?: string;
    status: string;
    budget: number;
    budgetType: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    itemDescription?: string;
    vehicleType?: string;
    deadline?: string;
    createdAt: string;
    creator: {
      id: string;
      name: string;
      avatarUrl?: string;
      isVerified?: boolean;
    };
    worker?: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  };
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  low: "#888888",
  normal: "#00ff9d",
  high: "#ff4d00",
  urgent: "#ff0000",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function TaskCard({ job, onClick }: TaskCardProps) {
  const typeIcon = getTaskTypeIcon(job.taskType || "standard");
  const typeColor = getTaskTypeColor(job.taskType || "standard");

  const formatBudget = (amount: number, type: string) => {
    if (type === "hourly") {
      return `$${amount}/hr`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 cursor-pointer hover:border-[#ff4d00]/50 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xl"
            style={{ filter: `drop-shadow(0 0 8px ${typeColor}40)` }}
          >
            {typeIcon}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {job.taskType || "Standard"}
          </span>
          {job.priority && job.priority !== "normal" && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${priorityColors[job.priority]}20`,
                color: priorityColors[job.priority],
                border: `1px solid ${priorityColors[job.priority]}40`,
              }}
            >
              {priorityLabels[job.priority]}
            </span>
          )}
        </div>
        <span className="text-[#00ff9d] font-bold">
          {formatBudget(job.budget, job.budgetType)}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="font-semibold text-lg text-white mb-2 line-clamp-1 group-hover:text-[#ff4d00] transition-colors">
        {job.title}
      </h3>
      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
        {job.description}
      </p>

      {/* Location Info for Ad Hoc Tasks */}
      {(job.taskType === "delivery" || job.taskType === "pickup") && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
          <MapPin className="w-4 h-4 text-[#ff4d00]" />
          <span className="line-clamp-1">
            {job.taskType === "delivery" ? (
              <>
                {job.pickupAddress?.split(",")[0] || "Pickup"} →{" "}
                {job.deliveryAddress?.split(",")[0] || "Delivery"}
              </>
            ) : (
              <>
                {job.pickupAddress?.split(",")[0] || "Pickup"} →{" "}
                {job.deliveryAddress?.split(",")[0] || "Destination"}
              </>
            )}
          </span>
        </div>
      )}

      {job.taskType === "assembly" && job.itemDescription && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
          <Wrench className="w-4 h-4 text-[#00ffff]" />
          <span className="line-clamp-1">{job.itemDescription}</span>
        </div>
      )}

      {/* Meta Info */}
      <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          {job.creator.avatarUrl ? (
            <img
              src={job.creator.avatarUrl}
              alt={job.creator.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-xs text-gray-400">
                {job.creator.name[0]}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-400">{job.creator.name}</span>
          {job.creator.isVerified && (
            <span className="text-[#00ff9d]">✓</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          {formatDate(job.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

interface TaskTypeFilterProps {
  selected: string;
  onChange: (type: string) => void;
}

const taskTypeFilters = [
  { type: "all", label: "All" },
  { type: "delivery", label: "🚗 Delivery" },
  { type: "pickup", label: "📦 Pickup" },
  { type: "errand", label: "🏃 Errand" },
  { type: "assembly", label: "🔧 Assembly" },
  { type: "standard", label: "📋 Standard" },
];

export function TaskTypeFilter({ selected, onChange }: TaskTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {taskTypeFilters.map((filter) => (
        <button
          key={filter.type}
          onClick={() => onChange(filter.type)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selected === filter.type
              ? "bg-[#ff4d00] text-white"
              : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-white"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
