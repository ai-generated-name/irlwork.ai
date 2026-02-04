"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Clock, MapPin, DollarSign, CheckCircle, AlertCircle, ArrowLeft, Briefcase } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  taskType: string;
  priority: string;
  createdAt: string;
  creator: { id: string; name: string; avatarUrl?: string };
  bookings?: Array<{ status: string }>;
}

export default function TasksPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchTasks();
  }, [isAuthenticated, router]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = statusFilter 
        ? `http://localhost:3001/api/dashboard/my-tasks?status=${statusFilter}`
        : "http://localhost:3001/api/dashboard/my-tasks";
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-[#00ff9d]";
      case "in_progress": return "text-yellow-500";
      case "pending_verification": return "text-[#ff4d00]";
      default: return "text-gray-400";
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
            <span className="font-display font-bold">My Tasks</span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-2xl font-bold">My Tasks</h1>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchTasks(); }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white"
            >
              <option value="">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-[#ff4d00]/30 border-t-[#ff4d00] rounded-full animate-spin mx-auto" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff4d00] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full bg-[#2a2a2a] ${getStatusColor(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />${task.budget}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        <span>Client: {task.creator.name}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {task.status === "in_progress" && (
                        <Link
                          href={`/tasks/${task.id}/proof`}
                          className="bg-[#ff4d00] hover:bg-[#cc3d00] px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                        >
                          Submit Proof
                        </Link>
                      )}
                      {task.status === "pending_verification" && (
                        <div className="flex items-center gap-2 text-yellow-500">
                          <Clock className="w-5 h-5" />
                          <span className="text-sm">Awaiting verification</span>
                        </div>
                      )}
                      {task.status === "completed" && (
                        <div className="flex items-center gap-2 text-[#00ff9d]">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">Paid</span>
                        </div>
                      )}
                    </div>
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
