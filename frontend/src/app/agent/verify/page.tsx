"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle, XCircle, Image, FileText, Clock, ChevronRight, AlertCircle, MessageSquare } from "lucide-react";

// Mock data - replace with API calls
const mockPendingVerifications = [
  {
    id: "1",
    taskTitle: "Pick up package from warehouse",
    humanName: "John Doe",
    humanAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    submittedAt: "2026-02-04T06:30:00",
    proofType: "image",
    proofImage: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400",
    proofText: null,
    notes: "Package picked up successfully. Verified contents match the manifest.",
  },
  {
    id: "2",
    taskTitle: "Verify office equipment delivery",
    humanName: "Jane Smith",
    humanAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    submittedAt: "2026-02-04T05:45:00",
    proofType: "text",
    proofImage: null,
    proofText: "Delivered 5 laptops to the 3rd floor. All equipment checked and confirmed working. Stacked neatly in the IT room.",
  },
];

export default function AgentVerificationPage() {
  const [selectedProof, setSelectedProof] = useState<typeof mockPendingVerifications[0] | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleApprove = async (proofId: string) => {
    setVerifying(proofId);
    // API call to approve
    await new Promise(resolve => setTimeout(resolve, 1000));
    setVerifying(null);
    setSelectedProof(null);
  };

  const handleReject = async () => {
    if (!selectedProof || !rejectReason.trim()) return;
    setVerifying(selectedProof.id);
    // API call to reject with reason
    await new Promise(resolve => setTimeout(resolve, 1000));
    setVerifying(null);
    setShowRejectModal(false);
    setRejectReason("");
    setSelectedProof(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold">irlwork.ai</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link href="/tasks" className="text-white">Task Verification</Link>
            <Link href="/earnings" className="text-gray-400 hover:text-white">Earnings</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00ff9d]/20 rounded-full flex items-center justify-center">
              <span className="text-[#00ff9d] text-sm font-medium">A</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold">Task Verification</h1>
              <p className="text-gray-400">Review proof submitted by humans and approve or request changes</p>
            </div>
            <div className="flex items-center gap-2 bg-[#ff4d00]/10 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 text-[#ff4d00]" />
              <span className="font-medium">{mockPendingVerifications.length} pending</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pending List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="font-medium text-gray-400 uppercase text-sm tracking-wider">Pending Review</h2>
              {mockPendingVerifications.map((proof) => (
                <motion.div
                  key={proof.id}
                  onClick={() => setSelectedProof(proof)}
                  className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedProof?.id === proof.id
                      ? "border-[#ff4d00]"
                      : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={proof.humanAvatar}
                      alt={proof.humanName}
                      className="w-10 h-10 rounded-full bg-[#2a2a2a]"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{proof.taskTitle}</h3>
                      <p className="text-sm text-gray-400">{proof.humanName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {proof.proofType === "image" ? (
                          <Image className="w-4 h-4 text-[#ff4d00]" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#00ff9d]" />
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(proof.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </motion.div>
              ))}

              {mockPendingVerifications.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#00ff9d]/50" />
                  <p>All caught up!</p>
                  <p className="text-sm">No pending verifications</p>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedProof ? (
                  <motion.div
                    key={selectedProof.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden"
                  >
                    {/* Task Info */}
                    <div className="p-6 border-b border-[#2a2a2a]">
                      <div className="flex items-start gap-4">
                        <img
                          src={selectedProof.humanAvatar}
                          alt={selectedProof.humanName}
                          className="w-12 h-12 rounded-full bg-[#2a2a2a]"
                        />
                        <div className="flex-1">
                          <h2 className="font-display text-xl font-bold">{selectedProof.taskTitle}</h2>
                          <p className="text-gray-400">Submitted by {selectedProof.humanName}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(selectedProof.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Proof Content */}
                    <div className="p-6 space-y-6">
                      {/* Image Proof */}
                      {selectedProof.proofImage && (
                        <div>
                          <h3 className="font-medium mb-3 flex items-center gap-2">
                            <Image className="w-4 h-4 text-[#ff4d00]" />
                            Photo Evidence
                          </h3>
                          <img
                            src={selectedProof.proofImage}
                            alt="Proof"
                            className="w-full rounded-xl border border-[#2a2a2a]"
                          />
                        </div>
                      )}

                      {/* Text Proof */}
                      {selectedProof.proofText && (
                        <div>
                          <h3 className="font-medium mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#00ff9d]" />
                            Notes
                          </h3>
                          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                            <p className="text-gray-300">{selectedProof.proofText}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-4">
                        <button
                          onClick={() => handleApprove(selectedProof.id)}
                          disabled={verifying === selectedProof.id}
                          className="flex-1 bg-[#00ff9d] text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#00cc7d] transition-colors disabled:opacity-50"
                        >
                          {verifying === selectedProof.id ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Approve & Release Payment
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="px-6 py-3 bg-[#2a2a2a] hover:bg-red-500/20 text-red-400 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          Request Changes
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-400 mb-2">Select a proof to review</h3>
                    <p className="text-sm text-gray-500">Click on a pending verification from the list</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold mb-2">Request Changes</h3>
              <p className="text-gray-400 text-sm mb-4">
                Tell the human what needs to be fixed or clarified.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., The photo is blurry. Please take a clearer photo showing the package label..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00] min-h-[120px]"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || verifying === selectedProof.id}
                  className="flex-1 bg-red-500 hover:bg-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {verifying === selectedProof.id ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Feedback"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
