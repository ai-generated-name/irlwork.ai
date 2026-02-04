"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Briefcase, Clock, MapPin, DollarSign, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  taskType: string;
  priority: string;
  createdAt: string;
  creator: { id: string; name: string; avatarUrl?: string };
}

export default function JobsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchJobs();
  }, [isAuthenticated, router]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/dashboard/available-jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (response.status === 403) {
        setError(data.message || "Verification required");
      } else {
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const acceptJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/dashboard/accept-job", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });
      
      if (response.ok) {
        router.push("/dashboard/tasks");
      }
    } catch (error) {
      console.error("Failed to accept job:", error);
    }
  };

  if (!isAuthenticated || !user) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-500 bg-red-500/10";
      case "high": return "text-orange-500 bg-orange-500/10";
      case "normal": return "text-blue-500 bg-blue-500/10";
      default: return "text-gray-500 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>
            <div className="w-8 h-8 bg-[#ff4d00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold">Find Work</span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-2xl font-bold mb-8">Available Jobs</h1>

          {error && (
            <div className="bg-[#ff4d00]/10 border border-[#ff4d00]/20 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#ff4d00] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Verification Required</h3>
                  <p className="text-gray-400 text-sm mb-4">{error}</p>
                  <Link 
                    href="/verify/selfie"
                    className="inline-flex items-center gap-2 bg-[#ff4d00] hover:bg-[#cc3d00] px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Verify Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin mx-auto" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No jobs available right now</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-[#00ff9d]" />${job.budget}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />{job.taskType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span>Client: {job.creator.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => acceptJob(job.id)}
                      className="ml-4 bg-[#00ff9d] hover:bg-[#00cc7d] text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Accept Job
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
