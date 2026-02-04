"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle, XCircle, Upload, Image, FileText, Send, Clock, MapPin, ArrowLeft, AlertCircle } from "lucide-react";

interface TaskProofPageProps {
  params: Promise<{ id: string }>;
}

export default function TaskProofPage({ params }: TaskProofPageProps) {
  const resolvedParams = useSearchParams();
  const taskId = resolvedParams.get("taskId") || "1";
  const [proofType, setProofType] = useState<"image" | "text" | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock task data (replace with API call)
  const task = {
    id: taskId,
    title: "Pick up package from warehouse",
    status: "in_progress",
    instructions: "Pick up the package from Warehouse B, check the contents, and deliver to the client address. Take a photo of the package and the delivery.",
    deadline: "2026-02-04T18:00:00",
    client: { name: "AI Agent #1247" },
    location: "123 Warehouse St, Downtown",
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofType) {
      setError("Please select a proof type");
      return;
    }

    if (proofType === "text" && !proofText.trim()) {
      setError("Please provide proof description");
      return;
    }

    if (proofType === "image" && !proofImage) {
      setError("Please upload a proof image");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // API call to submit proof
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mock delay
      
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit proof. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <header className="border-b border-[#2a2a2a] p-4">
          <div className="max-w-2xl mx-auto">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 bg-[#00ff9d]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#00ff9d]" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Proof Submitted!</h1>
            <p className="text-gray-400 mb-8">
              Your proof has been sent to the agent for verification. You'll be notified once they review it.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#ff4d00] hover:bg-[#cc3d00] px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Back to Tasks
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Due: {new Date(task.deadline).toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Task Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#ff4d00]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-[#ff4d00]" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-xl font-bold mb-2">{task.title}</h1>
                <p className="text-gray-400 text-sm mb-4">{task.instructions}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {task.location}
                  </span>
                  <span>Client: {task.client.name}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Proof Submission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-bold mb-4">Submit Proof of Completion</h2>

            {/* Proof Type Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setProofType("image")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  proofType === "image"
                    ? "border-[#ff4d00] bg-[#ff4d00]/10"
                    : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                }`}
              >
                <Image className={`w-8 h-8 mx-auto mb-2 ${proofType === "image" ? "text-[#ff4d00]" : "text-gray-400"}`} />
                <p className="font-medium">Photo Proof</p>
                <p className="text-xs text-gray-500 mt-1">Upload images of completed work</p>
              </button>
              <button
                onClick={() => setProofType("text")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  proofType === "text"
                    ? "border-[#ff4d00] bg-[#ff4d00]/10"
                    : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                }`}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${proofType === "text" ? "text-[#ff4d00]" : "text-gray-400"}`} />
                <p className="font-medium">Text Proof</p>
                <p className="text-xs text-gray-500 mt-1">Describe what you completed</p>
              </button>
            </div>

            {/* Image Upload */}
            <AnimatePresence>
              {proofType === "image" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {!proofImage ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-8 text-center cursor-pointer hover:border-[#ff4d00] transition-colors"
                    >
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400">Click to upload proof images</p>
                      <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={proofImage}
                        alt="Proof"
                        className="w-full rounded-xl border border-[#2a2a2a]"
                      />
                      <button
                        onClick={() => setProofImage(null)}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text Proof */}
            <AnimatePresence>
              {proofType === "text" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <textarea
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="Describe what you completed, any issues encountered, and confirm the task is done..."
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00] min-h-[150px]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              onClick={handleSubmitProof}
              disabled={submitting || !proofType}
              className="w-full mt-6 bg-[#ff4d00] hover:bg-[#cc3d00] py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit for Verification
                </>
              )}
            </button>
          </motion.div>

          {/* Info */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ff4d00]" />
              What happens next?
            </h3>
            <ul className="text-sm text-gray-400 space-y-1 ml-6">
              <li>1. The agent will review your proof</li>
              <li>2. They'll either approve or request more info</li>
              <li>3. Once approved, payment will be released</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
