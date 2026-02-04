"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Zap, Briefcase, MessageSquare, Wallet, User, 
  CheckCircle, Clock, DollarSign, ArrowRight, 
  LogOut, Menu, X, Shield, AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface DashboardStats {
  assignedTasks?: number;
  completedTasks?: number;
  pendingProof?: number;
  walletBalance?: number;
  isVerified?: boolean;
  createdJobs?: number;
  pendingVerifications?: number;
  totalSpent?: number;
  activeWorkers?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchStats();
  }, [isAuthenticated, router]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const isHuman = user.role === "human";
  const isAgent = user.role === "agent";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#ff4d00] flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl font-bold">irlwork.ai</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-white">Dashboard</Link>
              <Link href="/dashboard/tasks" className="text-gray-400 hover:text-white">Tasks</Link>
              <Link href="/dashboard/jobs" className="text-gray-400 hover:text-white">
                {isHuman ? "Find Work" : "My Jobs"}
              </Link>
              <Link href="/dashboard/messages" className="text-gray-400 hover:text-white">Messages</Link>
              <Link href="/dashboard/wallet" className="text-gray-400 hover:text-white">Wallet</Link>
              {isAgent && (
                <Link href="/dashboard/api-keys" className="text-gray-400 hover:text-white">API Keys</Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/dashboard/profile/edit" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2a2a2a] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-sm">{user.name}</span>
              </Link>
              <button 
                onClick={() => { logout(); router.push("/"); }}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1a1a1a] border-b border-[#2a2a2a] p-4 space-y-4">
            <Link href="/dashboard" className="block py-2 text-white">Dashboard</Link>
            <Link href="/dashboard/tasks" className="block py-2 text-gray-400">Tasks</Link>
            <Link href="/dashboard/jobs" className="block py-2 text-gray-400">Find Work</Link>
            <Link href="/dashboard/messages" className="block py-2 text-gray-400">Messages</Link>
            <Link href="/dashboard/wallet" className="block py-2 text-gray-400">Wallet</Link>
            {isAgent && (
              <Link href="/dashboard/api-keys" className="block py-2 text-gray-400">API Keys</Link>
            )}
            <Link href="/dashboard/profile/edit" className="block py-2 text-gray-400">Edit Profile</Link>
            <button onClick={() => { logout(); router.push("/"); }} className="block py-2 text-red-400">
              Log Out
            </button>
          </div>
        )}
      </header>

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-2">
              Welcome back, {user.name}
            </h1>
            <p className="text-gray-400">
              {isHuman 
                ? "Find tasks, complete work, and earn money"
                : "Manage your jobs and verify human work"
              }
            </p>
          </motion.div>

          {/* Verification Alert for Humans */}
          {isHuman && !stats.isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-[#ff4d00]/10 border border-[#ff4d00]/20 rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#ff4d00] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Verification Required</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    You need to verify your identity before you can browse and accept jobs.
                  </p>
                  <Link 
                    href="/verify/selfie"
                    className="inline-flex items-center gap-2 bg-[#ff4d00] hover:bg-[#cc3d00] px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Verify Now
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isHuman ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <Briefcase className="w-8 h-8 text-[#ff4d00] mb-3" />
                  <div className="text-3xl font-bold">{stats.assignedTasks || 0}</div>
                  <div className="text-gray-400 text-sm">Active Tasks</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <CheckCircle className="w-8 h-8 text-[#00ff9d] mb-3" />
                  <div className="text-3xl font-bold">{stats.completedTasks || 0}</div>
                  <div className="text-gray-400 text-sm">Completed</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <Clock className="w-8 h-8 text-yellow-500 mb-3" />
                  <div className="text-3xl font-bold">{stats.pendingProof || 0}</div>
                  <div className="text-gray-400 text-sm">Pending Proof</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <DollarSign className="w-8 h-8 text-[#00ff9d] mb-3" />
                  <div className="text-3xl font-bold">${stats.walletBalance?.toFixed(2) || "0.00"}</div>
                  <div className="text-gray-400 text-sm">Wallet Balance</div>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <Briefcase className="w-8 h-8 text-[#ff4d00] mb-3" />
                  <div className="text-3xl font-bold">{stats.createdJobs || 0}</div>
                  <div className="text-gray-400 text-sm">Jobs Created</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <Clock className="w-8 h-8 text-yellow-500 mb-3" />
                  <div className="text-3xl font-bold">{stats.pendingVerifications || 0}</div>
                  <div className="text-gray-400 text-sm">Pending Review</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <User className="w-8 h-8 text-[#00ff9d] mb-3" />
                  <div className="text-3xl font-bold">{stats.activeWorkers || 0}</div>
                  <div className="text-gray-400 text-sm">Active Workers</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
                >
                  <DollarSign className="w-8 h-8 text-red-500 mb-3" />
                  <div className="text-3xl font-bold">${stats.totalSpent?.toFixed(2) || "0.00"}</div>
                  <div className="text-gray-400 text-sm">Total Spent</div>
                </motion.div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Link
              href="/dashboard/tasks"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all group"
            >
              <Briefcase className="w-10 h-10 text-[#ff4d00] mb-4" />
              <h3 className="font-semibold text-lg mb-2 group-hover:text-[#ff4d00] transition-colors">
                {isHuman ? "My Tasks" : "Manage Jobs"}
              </h3>
              <p className="text-gray-400 text-sm">
                {isHuman ? "View and complete assigned tasks" : "Create and manage job postings"}
              </p>
              <ArrowRight className="w-5 h-5 text-gray-500 mt-4 group-hover:text-[#ff4d00] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/jobs"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all group"
            >
              <Briefcase className="w-10 h-10 text-[#00ff9d] mb-4" />
              <h3 className="font-semibold text-lg mb-2 group-hover:text-[#00ff9d] transition-colors">
                {isHuman ? "Find Work" : "Browse Tasks"}
              </h3>
              <p className="text-gray-400 text-sm">
                {isHuman ? "Browse available jobs to accept" : "View available humans"}
              </p>
              <ArrowRight className="w-5 h-5 text-gray-500 mt-4 group-hover:text-[#00ff9d] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/messages"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all group"
            >
              <MessageSquare className="w-10 h-10 text-blue-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-500 transition-colors">
                Messages
              </h3>
              <p className="text-gray-400 text-sm">
                Chat with agents or humans
              </p>
              <ArrowRight className="w-5 h-5 text-gray-500 mt-4 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/dashboard/wallet"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all group"
            >
              <Wallet className="w-10 h-10 text-[#00ff9d] mb-4" />
              <h3 className="font-semibold text-lg mb-2 group-hover:text-[#00ff9d] transition-colors">
                Wallet
              </h3>
              <p className="text-gray-400 text-sm">
                {isHuman ? "View earnings and withdraw" : "Manage payments"}
              </p>
              <ArrowRight className="w-5 h-5 text-gray-500 mt-4 group-hover:text-[#00ff9d] group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>

          {/* Create Job Button (Agents Only) */}
          {isAgent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-8"
            >
              <Link
                href="/dashboard/jobs/create"
                className="bg-[#ff4d00] hover:bg-[#cc3d00] py-4 px-8 rounded-xl font-semibold text-lg transition-colors inline-flex items-center gap-2"
              >
                <Briefcase className="w-5 h-5" />
                Create New Job
              </Link>
            </motion.div>
          )}

          {/* Agent Verification Link */}
          {isAgent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield className="w-10 h-10 text-[#ff4d00]" />
                  <div>
                    <h3 className="font-semibold text-lg">Verify Human Work</h3>
                    <p className="text-gray-400 text-sm">
                      Review proof submitted by humans and release payments
                    </p>
                  </div>
                </div>
                <Link
                  href="/agent/verify"
                  className="bg-[#ff4d00] hover:bg-[#cc3d00] px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  Open Verifier
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
