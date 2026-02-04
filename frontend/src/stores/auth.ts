import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'human' | 'agent';
  avatarUrl?: string;
  bio?: string;
  hourlyRate?: number;
  skills?: string;
  isVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('token') !== null;
};

// Helper to get current user role
export const getUserRole = (): 'human' | 'agent' | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('auth-storage');
  if (!userStr) return null;
  
  try {
    const state = JSON.parse(userStr);
    return state.state?.user?.role || null;
  } catch {
    return null;
  }
};

// Helper to get auth token
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};
