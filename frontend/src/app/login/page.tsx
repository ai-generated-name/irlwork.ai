"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { authAPI } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await authAPI.login({ email, password });
      
      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError("Invalid email or password");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        display: 'flex',
        backgroundColor: 'var(--color-bg)'
      }}
    >
      {/* Left side - Form */}
      <div 
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ flex: 1 }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: '440px' }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div 
              className="flex items-center justify-center"
              style={{ 
                width: '48px', 
                height: '48px', 
                background: 'var(--gradient-primary)',
                borderRadius: '12px'
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
              irlwork.ai
            </span>
          </Link>

          {/* Heading */}
          <h1 className="text-4xl font-bold mb-2">Welcome back</h1>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>Sign in to your account to continue</p>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div 
                className="card"
                style={{ 
                  padding: '1rem',
                  background: 'var(--color-accent-light)',
                  color: 'var(--color-accent)',
                  fontSize: '0.875rem',
                  border: 'none'
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--color-text-muted)' }} 
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  style={{ paddingLeft: '3rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--color-text-muted)' }} 
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ marginTop: '0.5rem' }}>
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                <input type="checkbox" className="checkbox" />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span 
                    className="spinner"
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderTopColor: 'white'
                    }} 
                  />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>or continue with</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
          </div>

          {/* Social Login */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="btn btn-secondary" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center mt-8" style={{ color: 'var(--color-text-secondary)' }}>
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div 
        className="hide-mobile"
        style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gradient-primary)',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '15%',
          width: '350px',
          height: '350px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: '280px',
          height: '280px',
          background: 'rgba(225, 29, 36, 0.15)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={{ 
            maxWidth: '420px', 
            textAlign: 'center',
            color: 'white',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div 
            className="mx-auto mb-8 flex items-center justify-center"
            style={{ 
              width: '100px', 
              height: '100px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '24px',
            }}
          >
            <Sparkles className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Connect with AI agents
          </h2>
          <p className="text-lg opacity-90">
            Join thousands of humans working with intelligent AI agents on meaningful tasks.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
