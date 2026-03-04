// Extracted from Dashboard.jsx — shared constants for dashboard layout and navigation
import React from 'react'
import {
  BarChart3, ClipboardList, Plus, Users, Handshake, MessageCircle,
  CreditCard, User, Settings, Check, Timer, MapPin, DollarSign,
  Star, CalendarDays, Search, ChevronDown, Upload, Bell,
  Shield, KeyRound
} from 'lucide-react'
import { TASK_CATEGORIES } from '../components/CategoryPills'

export const ICON_SIZE = 18

export const Icons = {
  dashboard: <BarChart3 size={ICON_SIZE} />,
  task: <ClipboardList size={ICON_SIZE} />,
  create: <Plus size={ICON_SIZE} />,
  humans: <Users size={ICON_SIZE} />,
  hired: <Handshake size={ICON_SIZE} />,
  messages: <MessageCircle size={ICON_SIZE} />,
  wallet: <CreditCard size={ICON_SIZE} />,
  profile: <User size={ICON_SIZE} />,
  settings: <Settings size={ICON_SIZE} />,
  check: <Check size={ICON_SIZE} />,
  clock: <Timer size={ICON_SIZE} />,
  location: <MapPin size={ICON_SIZE} />,
  dollar: <DollarSign size={ICON_SIZE} />,
  star: <Star size={ICON_SIZE} />,
  calendar: <CalendarDays size={ICON_SIZE} />,
  search: <Search size={ICON_SIZE} />,
  filter: <ChevronDown size={ICON_SIZE} />,
  upload: <Upload size={ICON_SIZE} />,
  bell: <Bell size={ICON_SIZE} />,
  admin: <Shield size={ICON_SIZE} />,
  key: <KeyRound size={ICON_SIZE} />,
}

export const styles = {
  btn: `px-5 py-2.5 rounded-[10px] font-medium transition-all duration-200 cursor-pointer border-0`,
  btnPrimary: `bg-coral text-white hover:bg-coral-dark shadow-v4-md hover:shadow-v4-lg`,
  btnSecondary: `bg-coral/10 text-coral hover:bg-coral/20`,
  btnSmall: `px-3 py-1.5 text-sm rounded-lg`,
  input: `w-full px-4 py-2.5 bg-[#F5F3F0] border border-[rgba(0,0,0,0.08)] rounded-[10px] text-[#1A1A1A] placeholder-[#AAAAAA] focus:border-coral focus:ring-2 focus:ring-coral/20 focus:outline-none transition-all`,
  card: `bg-white border border-[rgba(0,0,0,0.06)] rounded-[14px] p-4 shadow-v4-sm hover:shadow-v4-md transition-shadow`,
  container: `max-w-6xl mx-auto px-6`,
  gradient: `bg-cream`,
  // Dashboard-specific styles
  sidebar: `bg-cream`,
  sidebarNav: `text-[#888888] hover:bg-[#F5F3F0] hover:text-[#1A1A1A]`,
  sidebarNavActive: `bg-coral/[0.06] text-coral font-semibold`,
}

// Onboarding skill categories (exclude "All" filter option)
export const ONBOARDING_CATEGORIES = TASK_CATEGORIES.filter(c => c.value !== '')
