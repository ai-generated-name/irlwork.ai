"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, List, Filter, DollarSign, Clock, MapPin,
  Briefcase, Tag, X, ChevronDown, Search, SlidersHorizontal,
  ArrowLeft, Home, MessageSquare, Wallet
} from "lucide-react";
import { TaskMap } from "@/components/TaskMap";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import Link from "next/link";

interface TaskLocation {
  id: string;
  lat: number;
  lng: number;
  title: string;
  amount: number;
  category: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  duration: string;
  latitude: number;
  longitude: number;
  distance: number;
  createdAt: string;
  status: string;
  clientName: string;
}

const CATEGORIES = [
  { id: "all", name: "All Tasks", color: "#0A84FF" },
  { id: "cleaning", name: "Cleaning", color: "#30D158" },
  { id: "delivery", name: "Delivery", color: "#FF9F0A" },
  { id: "moving", name: "Moving", color: "#FF453A" },
  { id: "handyman", name: "Handyman", color: "#BF5AF2" },
  { id: "gardening", name: "Gardening", color: "#64D2FF" },
];

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Deep Clean 2BR Apartment",
    description: "Need a thorough deep clean of a 2 bedroom apartment including kitchen and bathroom.",
    amount: 150,
    category: "cleaning",
    duration: "3-4 hours",
    latitude: 51.505,
    longitude: -0.09,
    distance: 2.5,
    createdAt: "2026-02-06T06:00:00.000Z",
    status: "open",
    clientName: "John D.",
  },
  {
    id: "2",
    title: "Move Furniture to 3rd Floor",
    description: "Help move couch, bed, and dining table to 3rd floor apartment. Elevator available.",
    amount: 200,
    category: "moving",
    duration: "2-3 hours",
    latitude: 51.51,
    longitude: -0.1,
    distance: 1.2,
    createdAt: "2026-02-06T05:00:00.000Z",
    status: "open",
    clientName: "Sarah M.",
  },
  {
    id: "3",
    title: "Deliver Package Across Town",
    description: "Urgent delivery of documents from downtown to suburban area. Must be delivered by 5pm.",
    amount: 50,
    category: "delivery",
    duration: "1-2 hours",
    latitude: 51.49,
    longitude: -0.08,
    distance: 3.1,
    createdAt: "2026-02-06T04:00:00.000Z",
    status: "open",
    clientName: "Mike R.",
  },
  {
    id: "4",
    title: "Assemble IKEA PAX Wardrobe",
    description: "Need help assembling a large PAX wardrobe system. All parts and tools provided.",
    amount: 120,
    category: "handyman",
    duration: "2-3 hours",
    latitude: 51.515,
    longitude: -0.095,
    distance: 4.2,
    createdAt: "2026-02-06T03:00:00.000Z",
    status: "open",
    clientName: "Emma L.",
  },
];

export default function AvailableTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(10);
  const [sortBy, setSortBy] = useState<"newest" | "amount" | "distance">("newest");

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator?.geolocation) {
      window.navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        () => {
          setUserLocation({ latitude: 51.505, longitude: -0.09 });
        }
      );
    }
  }, []);

  const filteredTasks = useCallback(() => {
    let result = [...tasks];

    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      result = result.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result = result.filter((t) => (t.distance || 0) <= radius);

    switch (sortBy) {
      case "amount":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "distance":
        result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [tasks, selectedCategory, searchQuery, radius, sortBy]);

  // Convert Task to TaskLocation for TaskMap
  const taskLocations: TaskLocation[] = filteredTasks().map(t => ({
    id: t.id,
    lat: t.latitude,
    lng: t.longitude,
    title: t.title,
    amount: t.amount,
    category: t.category
  }));

  const handleAcceptTask = async (taskId: string) => {
    setAcceptingTask(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setModalOpen(false);
      setSelectedTask(null);
      router.push(`/dashboard/tasks/${taskId}`);
    } catch (error) {
      console.error("Failed to accept task:", error);
    } finally {
      setAcceptingTask(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'var(--glass-md)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: 'var(--glass-border)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem'
      }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontWeight: 600, fontSize: '1.125rem' }}>Available Tasks</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: '0.5rem',
              background: viewMode === "list" ? 'var(--color-primary-light)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: viewMode === "list" ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode("map")}
            style={{
              padding: '0.5rem',
              background: viewMode === "map" ? 'var(--color-primary-light)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: viewMode === "map" ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <Map size={18} />
          </button>
        </div>
      </header>

      <main style={{ paddingTop: '56px', paddingBottom: '80px' }}>
        <div style={{ display: 'flex' }}>
          {/* Filters Sidebar - Desktop */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  display: 'none',
                  width: '280px',
                  flexShrink: 0,
                  background: 'var(--color-bg-card)',
                  borderRight: '1px solid var(--color-border)',
                  padding: '1.5rem',
                  position: 'sticky',
                  top: '56px',
                  height: 'calc(100vh - 56px)',
                  overflowY: 'auto'
                }}
                className="lg:block"
              >
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={18} style={{ color: 'var(--color-primary)' }} />
                    Filters
                  </h2>
                </div>

                {/* Category Filter */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '1rem', fontSize: '0.875rem' }}>
                    Category
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          background: selectedCategory === cat.id ? 'var(--color-primary-light)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: cat.color
                          }}
                        />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Search
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)'
                      }}
                      size={16}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Radius */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Distance: {radius}km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--color-primary)'
                    }}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Mobile Filters Toggle */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)'
            }} className="lg:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SlidersHorizontal size={16} />
                  Filters
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--color-text-muted)',
                    transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>
            </div>

            {/* Sort & Count */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-card)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                {filteredTasks().length} tasks found
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="amount">Highest Rate</option>
                <option value="distance">Nearest</option>
              </select>
            </div>

            {viewMode === "list" ? (
              /* Task List */
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredTasks().map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      setSelectedTask(task);
                      setModalOpen(true);
                    }}
                    style={{
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="card-hover"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.625rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              background: `${CATEGORIES.find(c => c.id === task.category)?.color}15`,
                              color: CATEGORIES.find(c => c.id === task.category)?.color
                            }}
                          >
                            {task.category}
                          </span>
                          {task.distance && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} />
                              {task.distance}km
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>
                          {task.title}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {task.description}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', color: 'var(--color-accent)', fontWeight: 700 }}>
                          <DollarSign size={16} />
                          <span style={{ fontSize: '1.25rem' }}>{task.amount}</span>
                        </div>
                        {task.duration && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', justifyContent: 'flex-end' }}>
                            <Clock size={12} />
                            {task.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Map View */
              <div style={{ height: 'calc(100vh - 56px - 80px)' }}>
                <TaskMap
                  tasks={taskLocations}
                  userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined}
                  center={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined}
                  onTaskClick={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                      setSelectedTask(task);
                      setModalOpen(true);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav style={{
        display: 'none',
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
        <div style={{ display: 'flex', justifyContent: 'space-around', height: '100%' }}>
          <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <Home size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Home</span>
          </Link>
          <Link href="/available-tasks" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
            <Search size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Find Work</span>
          </Link>
          <Link href="/dashboard/tasks" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <Briefcase size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Tasks</span>
          </Link>
          <Link href="/dashboard/messages" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <MessageSquare size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Messages</span>
          </Link>
          <Link href="/dashboard/wallet" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <Wallet size={22} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>Wallet</span>
          </Link>
        </div>
      </nav>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTask(null);
        }}
        onAccept={handleAcceptTask}
        isLoading={acceptingTask}
      />
    </div>
  );
}
