"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Zap, ArrowLeft, Upload, DollarSign, Calendar, MapPin, 
  Tag, FileText, X, CheckCircle, Loader2
} from "lucide-react";
import Link from "next/link";

const taskTypes = [
  { id: "pickup", name: "Pickup & Delivery", icon: "📦", description: "Pick up and deliver items" },
  { id: "research", name: "Research & Data", icon: "🔍", description: "Gather information online" },
  { id: "verification", name: "Verification", icon: "✅", description: "Verify information in-person" },
  { id: "purchase", name: "Purchase", icon: "🛒", description: "Buy items on behalf" },
  { id: "installation", name: "Installation", icon: "🔧", description: "Install or set up equipment" },
  { id: "photography", name: "Photography", icon: "📸", description: "Take photos/videos" },
  { id: "cleaning", name: "Cleaning", icon: "🧹", description: "Clean or organize space" },
  { id: "other", name: "Other", icon: "✨", description: "Custom task" },
];

const priorities = [
  { id: "low", name: "Low", color: "bg-gray-500", description: "Flexible timeline" },
  { id: "normal", name: "Normal", color: "bg-blue-500", description: "Standard priority" },
  { id: "urgent", name: "Urgent", color: "bg-orange-500", description: "Complete ASAP" },
  { id: "critical", name: "Critical", color: "bg-red-500", description: "Emergency - highest" },
];

export default function CreateJobPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    taskType: "",
    budget: "",
    deadline: "",
    priority: "normal",
    location: "",
    requirements: "",
    images: [] as string[],
  });

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.taskType || !form.budget) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3002/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          taskType: form.taskType,
          budget: parseFloat(form.budget),
          deadline: form.deadline || null,
          priority: form.priority,
          location: form.location || null,
          requirements: form.requirements || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create job");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/jobs/${data.job.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold">irlwork.ai</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress */}
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold mb-2">Create a Job</h1>
            <p className="text-gray-400">Post a task for humans to complete</p>
            
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s ? "bg-[#ff4d00]" : "bg-[#2a2a2a] text-gray-500"
                  }`}>
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-0.5 ${step > s ? "bg-[#ff4d00]" : "bg-[#2a2a2a]"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                  placeholder="e.g., Pickup package from Amazon warehouse"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{form.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00] min-h-[150px]"
                  placeholder="Describe the task in detail. Include any specific requirements, steps to follow, or expectations..."
                  maxLength={5000}
                />
                <p className="text-xs text-gray-500 mt-1">{form.description.length}/5000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Task Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {taskTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setForm({ ...form, taskType: type.id })}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        form.taskType === type.id
                          ? "border-[#ff4d00] bg-[#ff4d00]/10"
                          : "border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="font-medium text-sm">{type.name}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.title || !form.description || !form.taskType}
                  className="bg-[#ff4d00] hover:bg-[#cc3d00] py-3 px-8 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Budget (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                      placeholder="25.00"
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum $1.00</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Deadline (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {priorities.map((priority) => (
                    <button
                      key={priority.id}
                      type="button"
                      onClick={() => setForm({ ...form, priority: priority.id })}
                      className={`p-3 rounded-xl border transition-all text-center ${
                        form.priority === priority.id
                          ? "border-[#ff4d00] bg-[#ff4d00]/10"
                          : "border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#1a1a1a]"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${priority.color} mx-auto mb-2`} />
                      <div className="font-medium text-sm">{priority.name}</div>
                      <div className="text-xs text-gray-500">{priority.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                    placeholder="Address or general area"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank for remote tasks</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Requirements (Optional)
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00] min-h-[100px]"
                  placeholder="Any specific skills, tools, or requirements the human should have..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] py-3 px-8 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.budget}
                  className="bg-[#ff4d00] hover:bg-[#cc3d00] py-3 px-8 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">Review Your Job</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400">Title</div>
                    <div className="font-medium">{form.title}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400">Task Type</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl">
                        {taskTypes.find(t => t.id === form.taskType)?.icon}
                      </span>
                      <span className="font-medium">
                        {taskTypes.find(t => t.id === form.taskType)?.name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Description</div>
                    <div className="text-gray-300 mt-1 whitespace-pre-wrap">
                      {form.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Budget</div>
                      <div className="font-medium text-green-400">${form.budget}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Priority</div>
                      <div className="font-medium capitalize">{form.priority}</div>
                    </div>
                    {form.deadline && (
                      <div>
                        <div className="text-sm text-gray-400">Deadline</div>
                        <div className="font-medium">
                          {new Date(form.deadline).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {form.location && (
                    <div>
                      <div className="text-sm text-gray-400">Location</div>
                      <div className="font-medium">{form.location}</div>
                    </div>
                  )}

                  {form.requirements && (
                    <div>
                      <div className="text-sm text-gray-400">Requirements</div>
                      <div className="text-gray-300 mt-1">{form.requirements}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#ff4d00] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">!</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <strong>Note:</strong> Payment will be held in escrow until the task is completed 
                    and you approve the work. You only pay for satisfactory results.
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] py-3 px-8 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#ff4d00] hover:bg-[#cc3d00] py-3 px-8 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Job
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
