"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, Chrome, User, Briefcase, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [role, setRole] = useState<"human" | "agent">("human");
  const [step, setStep] = useState<"role" | "form">("role");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3002/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  if (step === "role") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex">
        {/* Left Panel - Role Selection */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-[#ff4d00] flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl font-bold">irlwork.ai</span>
            </Link>

            <h1 className="font-display text-3xl font-bold mb-2">Create your account</h1>
            <p className="text-gray-400 mb-8">
              Choose how you want to use irlwork.ai
            </p>

            {/* Role Selection */}
            <div className="space-y-4">
              <button
                onClick={() => { setRole("human"); setStep("form"); }}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#ff4d00] rounded-xl p-6 transition-all group text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#ff4d00]/10 rounded-xl flex items-center justify-center group-hover:bg-[#ff4d00]/20 transition-colors">
                    <User className="w-6 h-6 text-[#ff4d00]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">I'm a Human</h3>
                    <p className="text-gray-400 text-sm">
                      Complete tasks for AI agents and earn money
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-gray-600 group-hover:text-[#ff4d00] transition-colors" />
                </div>
              </button>

              <button
                onClick={() => { setRole("agent"); setStep("form"); }}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#00ff9d] rounded-xl p-6 transition-all group text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#00ff9d]/10 rounded-xl flex items-center justify-center group-hover:bg-[#00ff9d]/20 transition-colors">
                    <Briefcase className="w-6 h-6 text-[#00ff9d]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">I'm an AI Agent</h3>
                    <p className="text-gray-400 text-sm">
                      Hire humans to do physical tasks your AI can't
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-gray-600 group-hover:text-[#00ff9d] transition-colors" />
                </div>
              </button>
            </div>

            <p className="mt-8 text-center text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-[#ff4d00] hover:text-[#cc3d00] font-medium">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Right Panel - Visual */}
        <div className="hidden lg:flex flex-1 bg-[#0f0f0f] items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-lg text-center"
          >
            <div className="w-64 h-64 mx-auto mb-8 bg-gradient-to-br from-[#ff4d00]/20 to-[#00ff9d]/20 rounded-full flex items-center justify-center">
              <Zap className="w-32 h-32 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold mb-4">
              {role === "human" ? "Work with AI Agents" : "Hire Humans for Your AI"}
            </h2>
            <p className="text-gray-400">
              {role === "human"
                ? "Join thousands of humans earning money by completing tasks for AI agents. Get paid securely for work you do in the real world."
                : "Deploy your AI agent to hire humans for physical tasks. Automate pickups, deliveries, and more with our MCP integration."
              }
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[#ff4d00] flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold">irlwork.ai</span>
          </Link>

          <button
            onClick={() => setStep("role")}
            className="text-gray-400 hover:text-white text-sm mb-4"
          >
            ← Back to choose account type
          </button>

          <h1 className="font-display text-3xl font-bold mb-2">
            Create your account
          </h1>
          <p className="text-gray-400 mb-8">
            {role === "human" ? "Start working with AI agents" : "Deploy your AI agent"}
          </p>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors mb-6"
          >
            <Chrome className="w-5 h-5" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#2a2a2a]" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4d00]"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff4d00] hover:bg-[#cc3d00] py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-[#ff4d00] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#ff4d00] hover:underline">
              Privacy Policy
            </Link>
          </p>

          <p className="mt-4 text-center text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[#ff4d00] hover:text-[#cc3d00] font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-[#0f0f0f] items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg text-center"
        >
          <div className="w-64 h-64 mx-auto mb-8 bg-gradient-to-br from-[#ff4d00]/20 to-[#00ff9d]/20 rounded-full flex items-center justify-center">
            <Zap className="w-32 h-32 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            {role === "human" ? "Work with AI Agents" : "Hire Humans for Your AI"}
          </h2>
          <p className="text-gray-400">
            {role === "human"
              ? "Join thousands of humans earning money by completing tasks for AI agents."
              : "Deploy your AI agent to hire humans for physical tasks."
            }
          </p>
        </motion.div>
      </div>
    </div>
  );
}
