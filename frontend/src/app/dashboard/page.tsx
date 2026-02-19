"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Zap, Briefcase, MessageSquare, Wallet, User, 
  CheckCircle, Clock, DollarSign, ArrowRight, 
  LogOut, Menu, X, Shield, Settings, Search,
  ChevronRight, Bell
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

// Navigation items - conditionally show based on role
const getNavItems = (role: string) => [
  { href: "/dashboard", icon: HomeIcon, label: "Dashboard" },
  ...(role === "human" ? [
    { href: "/dashboard/tasks", icon: Briefcase, label: "My Tasks" },
    { href: "/available-tasks", icon: Search, label: "Find Work" },
    { href: "/dashboard/earnings", icon: DollarSign, label: "Earnings" },
  ] : [
    { href: "/dashboard/my-jobs", icon: Briefcase, label: "My Jobs" },
    { href: "/dashboard/jobs/create", icon: Search, label: "Post Job" },
  ]),
  { href: "/dashboard/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const navItems = getNavItems("human"); // Default for SSR

function HomeIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 9 9-3 9 9 9 9-3 9 9"/><path d="M9 22V12h6v10"/>
    </svg>
  );
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
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

  const quickActions = [
    { 
      href: "/available-tasks", 
      icon: Search, 
      label: isHuman ? "Find Work" : "Browse Tasks",
      desc: isHuman ? "Browse available jobs" : "View available humans",
      color: "var(--color-primary)",
      bg: "var(--color-primary-light)",
    },
    { 
      href: "/dashboard/tasks", 
      icon: Briefcase, 
      label: isHuman ? "My Tasks" : "Manage Jobs",
      desc: isHuman ? "View assigned tasks" : "Create and manage jobs",
      color: "var(--color-accent)",
      bg: "var(--color-accent-light)",
    },
    { 
      href: "/dashboard/messages", 
      icon: MessageSquare, 
      label: "Messages",
      desc: "Chat with agents or humans",
      color: "#FF9F0A",
      bg: "var(--color-warning-light)",
    },
    { 
      href: "/dashboard/wallet", 
      icon: Wallet, 
      label: "Wallet",
      desc: isHuman ? "View earnings" : "Manage payments",
      color: "#FF453A",
      bg: "var(--color-danger-light)",
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Mobile Header */}
      <header style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'var(--glass-md)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: 'var(--glass-border)',
        zIndex: 200,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem'
      }} className="lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div style={{ 
            width: '32px', 
            height: '32px', 
            background: 'var(--gradient-primary)', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>irlwork.ai</span>
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 199,
          background: 'var(--color-bg)',
          paddingTop: '56px'
        }} className="lg:block">
          <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <item.icon size={20} />
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </Link>
            ))}
            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.75rem 0' }} />
            <button 
              onClick={() => { logout(); router.push("/"); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                color: 'var(--color-danger)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <LogOut size={20} />
              <span style={{ fontWeight: 500 }}>Log out</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        background: 'var(--color-bg-card)',
        borderRight: '1px solid var(--color-border)',
        flexDirection: 'column',
        zIndex: 100
      }} className="lg:flex">
        {/* Logo */}
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <Link href="/" className="flex items-center gap-2">
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: 'var(--gradient-primary)', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '1.125rem', fontFamily: 'var(--font-display)' }}>irlwork.ai</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ 
          padding: '1rem', 
          borderTop: '1px solid var(--color-border)' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.5rem',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: 'var(--gradient-primary)', 
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>{user.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: 0,
        minHeight: '100vh',
        paddingTop: '56px'
      }} className="lg:ml-260px lg:pt-0">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '2rem' }}
          >
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Welcome back, {user.name}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
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
              style={{ 
                marginBottom: '1.5rem',
                background: 'var(--color-warning-light)',
                border: '1px solid rgba(255, 214, 10, 0.3)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'rgba(255, 214, 10, 0.2)', 
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={20} style={{ color: 'var(--color-warning)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Verification Required</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    You need to verify your identity before you can browse and accept jobs.
                  </p>
                  <Link 
                    href="/verify/selfie"
                    className="btn btn-primary btn-sm"
                  >
                    Verify Now
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '1rem', 
            marginBottom: '2rem' 
          }} className="lg:grid-cols-4">
            {isHuman ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <Briefcase size={20} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-primary-light)', 
                      color: 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Active</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.assignedTasks || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Active Tasks</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <CheckCircle size={20} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-accent-light)', 
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Done</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.completedTasks || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Completed</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <Clock size={20} style={{ color: 'var(--color-warning)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-warning-light)', 
                      color: 'var(--color-warning)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Pending</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.pendingProof || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Pending Proof</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <DollarSign size={20} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-accent-light)', 
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Balance</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>${stats.walletBalance?.toFixed(2) || "0.00"}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Wallet</div>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <Briefcase size={20} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-primary-light)', 
                      color: 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Created</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.createdJobs || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Jobs Created</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <Clock size={20} style={{ color: 'var(--color-warning)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-warning-light)', 
                      color: 'var(--color-warning)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Review</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.pendingVerifications || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Pending Review</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <User size={20} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-accent-light)', 
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Active</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stats.activeWorkers || 0}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Active Workers</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <DollarSign size={20} style={{ color: 'var(--color-danger)' }} />
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 600, 
                      padding: '0.125rem 0.5rem',
                      background: 'var(--color-danger-light)', 
                      color: 'var(--color-danger)',
                      borderRadius: 'var(--radius-full)' 
                    }}>Spent</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>${stats.totalSpent?.toFixed(2) || "0.00"}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>Total Spent</div>
                </motion.div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: '2rem' }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Quick actions</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem' 
            }} className="sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="card card-hover"
                  style={{ padding: '1.25rem' }}
                >
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    background: action.bg, 
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    <action.icon size={22} style={{ color: action.color }} />
                  </div>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{action.label}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>{action.desc}</p>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Agent Verification Link */}
          {isAgent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card"
              style={{ padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'var(--color-primary-light)', 
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Shield size={24} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Verify Human Work</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      Review proof submitted by humans and release payments
                    </p>
                  </div>
                </div>
                <Link href="/agent/verify" className="btn btn-primary btn-sm" style={{ gap: '0.5rem' }}>
                  Open Verifier
                  <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          )}

          {/* Create Job Button (Agents Only) */}
          {isAgent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginTop: '1.5rem' }}
            >
              <Link href="/dashboard/jobs/create" className="btn btn-primary">
                <Briefcase size={18} />
                Create New Job
              </Link>
            </motion.div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav style={{
        display: 'flex',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--glass-md)',
        backdropFilter: 'var(--glass-blur)',
        borderTop: 'var(--glass-border)',
        zIndex: 200,
        padding: '0 0.5rem'
      }} className="lg:hidden">
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', height: '100%' }}>
          <Link href="/dashboard" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.25rem', 
            padding: '0.5rem',
            color: 'var(--color-primary)', 
            textDecoration: 'none' 
          }}>
            <HomeIcon size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Home</span>
          </Link>
          <Link href="/available-tasks" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.25rem', 
            padding: '0.5rem',
            color: 'var(--color-text-muted)', 
            textDecoration: 'none' 
          }}>
            <Search size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Find Work</span>
          </Link>
          <Link href="/dashboard/tasks" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.25rem', 
            padding: '0.5rem',
            color: 'var(--color-text-muted)', 
            textDecoration: 'none' 
          }}>
            <Briefcase size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Tasks</span>
          </Link>
          <Link href="/dashboard/messages" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.25rem', 
            padding: '0.5rem',
            color: 'var(--color-text-muted)', 
            textDecoration: 'none' 
          }}>
            <MessageSquare size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Messages</span>
          </Link>
          <Link href="/dashboard/wallet" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.25rem', 
            padding: '0.5rem',
            color: 'var(--color-text-muted)', 
            textDecoration: 'none' 
          }}>
            <Wallet size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Wallet</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
