/**
 * Login.jsx — Secure authentication gate for ICA DBMS
 *
 * Authenticates against 4 hardcoded user roles:
 *   admin@ica.com      / admin123   → Admin (full access)
 *   technician@ica.com / tech2026   → Technician (maintenance only)
 *   inventory@ica.com  / inv2026    → Inventory Manager (stock only)
 *   manager@ica.com    / mgr2026    → Manager (read-only dashboard + orders)
 */

import { useState } from 'react'
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'
import logoSrc from '../assets/logo.png'

// ─── Role-based user registry ───────────────────────────────────────────────
const USERS = [
  {
    email:       'admin@ica.com',
    password:    'admin123',
    role:        'admin',
    name:        'Administrator',
    defaultPage: 'dashboard',
  },
  {
    email:       'technician@ica.com',
    password:    'tech2026',
    role:        'technician',
    name:        'Field Technician',
    defaultPage: 'maintenance',
  },
  {
    email:       'inventory@ica.com',
    password:    'inv2026',
    role:        'inventory',
    name:        'Inventory Manager',
    defaultPage: 'inventory',
  },
  {
    email:       'manager@ica.com',
    password:    'mgr2026',
    role:        'manager',
    name:        'Operations Manager',
    defaultPage: 'dashboard',
  },
]

export default function Login({ onSuccess }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      // Find a matching user record
      const matched = USERS.find(
        u => u.email === email.trim().toLowerCase() && u.password === password
      )

      if (matched) {
        // Pass the full user object (role, name, defaultPage) to App.jsx
        onSuccess(matched)
      } else {
        setError('Invalid email or password. Please try again.')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Decorative background grid ───────────────────────────── */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Ambient glow blobs ───────────────────────────────────── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Login Card ───────────────────────────────────────────── */}
      <div className="relative w-full max-w-md animate-modal-in">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-sky-500 rounded-t-2xl" />

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 border-t-0 rounded-b-2xl shadow-2xl shadow-slate-950/80 p-8">

          {/* ── Brand header ───────────────────────────────────── */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoSrc} alt="ICA Logo" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-xs font-bold text-sky-400 uppercase tracking-[0.2em]">ICA</p>
                <p className="text-base font-extrabold text-slate-100 leading-tight">
                  Controls &amp; Automation
                </p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/80
                             border border-slate-700/60 rounded-full px-3 py-0.5 tracking-widest uppercase">
              Enterprise Edition 2026
            </span>

            <div className="w-full border-t border-slate-800 mt-5 mb-1" />
            <p className="text-sm font-semibold text-slate-400 mt-3">Sign in to your account</p>
            <p className="text-xs text-slate-600 mt-1">Authorised personnel only</p>
          </div>

          {/* ── Login Form ─────────────────────────────────────── */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@ica.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl
                             pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                             transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl
                             pl-10 pr-12 py-3 text-sm text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                             transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500
                             hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10
                              border border-red-500/30 text-red-400 text-xs animate-slide-up">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2
                         bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400
                         text-white font-semibold py-3 rounded-xl text-sm
                         shadow-lg shadow-sky-600/25 transition-all duration-200
                         active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Access Dashboard
                </>
              )}
            </button>

          </form>

          {/* ── Card footer ────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-600">© 2026 ICA. All rights reserved.</p>
            <p className="text-[10px] text-slate-700 mt-0.5">Systems by SHAK Systems</p>
          </div>

        </div>
      </div>

    </div>
  )
}
