"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Package, Scale, Ruler, List, AlertCircle } from "lucide-react";

interface AdhocTaskFormProps {
  taskType: string;
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const vehicleTypes = [
  { value: "car", label: "Car", description: "Standard sedan or hatchback" },
  { value: "van", label: "Van", description: "Mini van or SUV" },
  { value: "truck", label: "Truck", description: "Pickup truck" },
  { value: "none", label: "None", description: "Walking distance" },
];

const priorities = [
  { value: "low", label: "Low", color: "#888888" },
  { value: "normal", label: "Normal", color: "#00ff9d" },
  { value: "high", label: "High", color: "#ff4d00" },
  { value: "urgent", label: "Urgent", color: "#ff0000" },
];

export function AdhocTaskForm({ taskType, formData, onChange }: AdhocTaskFormProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const renderDeliveryFields = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Pickup Address
          </label>
          <textarea
            value={formData.pickupAddress || ""}
            onChange={(e) => updateField("pickupAddress", e.target.value)}
            placeholder="Enter pickup address with any access instructions..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Delivery Address
          </label>
          <textarea
            value={formData.deliveryAddress || ""}
            onChange={(e) => updateField("deliveryAddress", e.target.value)}
            placeholder="Enter delivery address with any access instructions..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
            rows={3}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Package className="w-4 h-4 inline mr-1" />
          Item Description
        </label>
        <input
          type="text"
          value={formData.itemDescription || ""}
          onChange={(e) => updateField("itemDescription", e.target.value)}
          placeholder="Describe what you're delivering (e.g., '20x30 inch framed artwork', '40lb treadmill')"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Scale className="w-4 h-4 inline mr-1" />
            Weight (kg)
          </label>
          <input
            type="number"
            value={formData.itemWeight || ""}
            onChange={(e) => updateField("itemWeight", e.target.value)}
            placeholder="e.g., 15"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Ruler className="w-4 h-4 inline mr-1" />
            Dimensions (cm)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="L"
              value={formData.itemDimensions?.length || ""}
              onChange={(e) =>
                updateField("itemDimensions", {
                  ...formData.itemDimensions,
                  length: e.target.value,
                })
              }
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
            />
            <input
              type="number"
              placeholder="W"
              value={formData.itemDimensions?.width || ""}
              onChange={(e) =>
                updateField("itemDimensions", {
                  ...formData.itemDimensions,
                  width: e.target.value,
                })
              }
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
            />
            <input
              type="number"
              placeholder="H"
              value={formData.itemDimensions?.height || ""}
              onChange={(e) =>
                updateField("itemDimensions", {
                  ...formData.itemDimensions,
                  height: e.target.value,
                })
              }
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Vehicle Required
          </label>
          <select
            value={formData.vehicleType || ""}
            onChange={(e) => updateField("vehicleType", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:border-[#ff4d00] focus:outline-none"
          >
            <option value="">Select vehicle</option>
            {vehicleTypes.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} - {v.description}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );

  const renderPickupFields = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Pickup Address
        </label>
        <textarea
          value={formData.pickupAddress || ""}
          onChange={(e) => updateField("pickupAddress", e.target.value)}
          placeholder="Where should the worker pick up the item from?"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Delivery Address
        </label>
        <textarea
          value={formData.deliveryAddress || ""}
          onChange={(e) => updateField("deliveryAddress", e.target.value)}
          placeholder="Where should the item be delivered?"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Package className="w-4 h-4 inline mr-1" />
          Item Description
        </label>
        <input
          type="text"
          value={formData.itemDescription || ""}
          onChange={(e) => updateField("itemDescription", e.target.value)}
          placeholder="What item needs to be picked up?"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Scale className="w-4 h-4 inline mr-1" />
            Estimated Weight (kg)
          </label>
          <input
            type="number"
            value={formData.itemWeight || ""}
            onChange={(e) => updateField("itemWeight", e.target.value)}
            placeholder="Approximate weight"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Pickup Window
          </label>
          <input
            type="text"
            placeholder="e.g., Between 2-5 PM"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderErrandFields = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          Errand Type
        </label>
        <select
          value={formData.errandDetails?.type || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              type: e.target.value,
            })
          }
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:border-[#ff4d00] focus:outline-none"
        >
          <option value="">Select errand type</option>
          <option value="grocery">Grocery Shopping</option>
          <option value="pharmacy">Pharmacy Pickup</option>
          <option value="return">Store Return</option>
          <option value="dropoff">Document/Parcel Dropoff</option>
          <option value="appointment">Appointment Attendance</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Errand Details
        </label>
        <textarea
          value={formData.errandDetails?.description || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              description: e.target.value,
            })
          }
          placeholder="Describe the errand in detail. Include any specific stores, products, or instructions..."
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Budget for Purchases (if applicable)
        </label>
        <input
          type="number"
          value={formData.errandDetails?.purchaseBudget || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              purchaseBudget: e.target.value,
            })
          }
          placeholder="Amount for any purchases (will be reimbursed)"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateField("priority", p.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.priority === p.value
                    ? "bg-[#ff4d00] text-white"
                    : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={formData.errandDetails?.deadline || ""}
            onChange={(e) =>
              updateField("errandDetails", {
                ...formData.errandDetails,
                deadline: e.target.value,
              })
            }
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:border-[#ff4d00] focus:outline-none"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderAssemblyFields = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <List className="w-4 h-4 inline mr-1" />
          Items to Assemble
        </label>
        <textarea
          value={formData.assemblyItems || ""}
          onChange={(e) => updateField("assemblyItems", e.target.value)}
          placeholder="List all items that need assembly (e.g., IKEA KALLAX shelf, NordicTrack treadmill, etc.)"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Package className="w-4 h-4 inline mr-1" />
          Assembly Location
        </label>
        <textarea
          value={formData.errandDetails?.location || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              location: e.target.value,
            })
          }
          placeholder="Where should the assembly take place? Include any access instructions..."
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Special Tools Required
        </label>
        <input
          type="text"
          value={formData.errandDetails?.tools || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              tools: e.target.value,
            })
          }
          placeholder="e.g., Power drill, Allen wrench set (or 'Worker should bring all tools')"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Assembly Instructions or Manual URL
        </label>
        <input
          type="url"
          value={formData.errandDetails?.instructions || ""}
          onChange={(e) =>
            updateField("errandDetails", {
              ...formData.errandDetails,
              instructions: e.target.value,
            })
          }
          placeholder="https://... (link to assembly instructions if available)"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estimated Time (minutes)
          </label>
          <input
            type="number"
            value={formData.estimatedHours ? formData.estimatedHours * 60 : ""}
            onChange={(e) =>
              updateField("estimatedHours", parseInt(e.target.value) / 60)
            }
            placeholder="e.g., 90"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#ff4d00] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Priority
          </label>
          <select
            value={formData.priority || "normal"}
            onChange={(e) => updateField("priority", e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:border-[#ff4d00] focus:outline-none"
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );

  if (taskType === "standard" || !taskType) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-[#2a2a2a]/50 rounded-lg border border-[#2a2a2a]"
      >
        <p className="text-gray-400 text-sm">
          Standard task type selected. Use the general description field above for your task details.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {taskType === "delivery" && renderDeliveryFields()}
      {taskType === "pickup" && renderPickupFields()}
      {taskType === "errand" && renderErrandFields()}
      {taskType === "assembly" && renderAssemblyFields()}
    </div>
  );
}
