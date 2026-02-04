"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Camera, Upload, CheckCircle, XCircle, RefreshCw, ArrowLeft, Shield } from "lucide-react";
import Webcam from "react-webcam";

interface VerificationStatus {
  status: "idle" | "capturing" | "uploading" | "success" | "error";
  message?: string;
}

export default function SelfieVerificationPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>({ status: "idle" });
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const image = webcamRef.current.getScreenshot();
      setImgSrc(image);
      setStatus({ status: "idle" });
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
    setStatus({ status: "idle" });
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const uploadSelfie = async () => {
    if (!imgSrc) return;

    setStatus({ status: "uploading", message: "Verifying you're human..." });

    try {
      // Convert base64 to blob
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

      // Create form data
      const formData = new FormData();
      formData.append("selfie", file);

      // Upload to backend
      const uploadResponse = await fetch("http://localhost:3001/api/verify/selfie", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Verification failed");
      }

      setStatus({ status: "success", message: "You're verified! 🎉" });
      
      // Update local storage
      const userStr = localStorage.getItem("auth-storage");
      if (userStr) {
        const userData = JSON.parse(userStr);
        userData.state.user.isVerified = true;
        localStorage.setItem("auth-storage", JSON.stringify(userData));
      }

      // Redirect after delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ status: "error", message: "Verification failed. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold">irlwork.ai</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          {/* Status Card */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#ff4d00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#ff4d00]" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">
                Verify You're Human
              </h1>
              <p className="text-gray-400">
                Take a selfie to confirm your identity. This helps keep the platform safe.
              </p>
            </div>

            {/* Camera/Image Area */}
            <div className="relative aspect-[4/5] bg-[#0a0a0a] rounded-xl overflow-hidden mb-6">
              <AnimatePresence mode="wait">
                {!imgSrc ? (
                  <motion.div
                    key="camera"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full"
                  >
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode,
                        width: 720,
                        height: 900,
                      }}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Camera Controls */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button
                        onClick={switchCamera}
                        className="p-3 bg-[#1a1a1a]/80 backdrop-blur rounded-full hover:bg-[#2a2a2a] transition-colors"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Face Frame Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-64 border-2 border-[#00ff9d]/50 rounded-2xl" />
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-64 flex items-center justify-center">
                        <span className="text-[#00ff9d] text-xs bg-[#0a0a0a] px-2">
                          Position your face here
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full"
                  >
                    <img
                      src={imgSrc}
                      alt="Selfie"
                      className="w-full h-full object-cover"
                    />
                    {status.status === "success" && (
                      <div className="absolute inset-0 bg-[#00ff9d]/20 flex items-center justify-center">
                        <CheckCircle className="w-16 h-16 text-[#00ff9d]" />
                      </div>
                    )}
                    {status.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-16 h-16 text-red-500" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Overlay */}
              <AnimatePresence>
                {status.status === "uploading" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 border-4 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin mb-4" />
                    <p className="text-gray-300">{status.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!imgSrc ? (
                <button
                  onClick={capture}
                  className="w-full bg-[#ff4d00] hover:bg-[#cc3d00] py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Take Selfie
                </button>
              ) : status.status !== "success" ? (
                <>
                  <button
                    onClick={uploadSelfie}
                    disabled={status.status === "uploading"}
                    className="w-full bg-[#ff4d00] hover:bg-[#cc3d00] py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {status.status === "uploading" ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Submit for Verification
                      </>
                    )}
                  </button>
                  <button
                    onClick={retake}
                    disabled={status.status === "uploading"}
                    className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Retake
                  </button>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="block w-full bg-[#00ff9d] text-black py-4 rounded-xl font-semibold text-center hover:bg-[#00cc7d] transition-colors"
                >
                  Continue to Dashboard
                </Link>
              )}
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-[#0f0f0f] rounded-xl">
              <h3 className="font-medium mb-2">Tips for best results:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Ensure good lighting on your face</li>
                <li>• Look directly at the camera</li>
                <li>• Keep your face within the frame</li>
                <li>• Remove sunglasses or hats</li>
              </ul>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {status.status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <p className="text-red-400 text-sm text-center">{status.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {status.status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-[#00ff9d]/10 border border-[#00ff9d]/20 rounded-xl"
                >
                  <div className="flex items-center justify-center gap-2 text-[#00ff9d]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{status.message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
