/**
 * Sidebar.jsx — Fixed left navigation panel
 *
 * Nav links are filtered by the logged-in user's role:
 *   admin       → Dashboard, Inventory, Clients, Orders, Maintenance
 *   technician  → Dashboard, Maintenance
 *   inventory   → Dashboard, Inventory
 *   manager     → Dashboard, Orders
 *
 * The user's name and a role badge are shown above the nav links.
 */

import {
  LayoutDashboard,
  Package,
  Users,
  ClipboardList,
  Wrench,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Wrench as TechIcon,
  BarChart2,
  Eye,
  FileText,
} from 'lucide-react'
import logoSrc from '../assets/logo.png'

// ── All possible nav items with role allowlists ──────────────────
const ALL_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'technician', 'inventory', 'manager'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['admin', 'inventory'],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    roles: ['admin'],
  },
  {
    id: 'orders',
    label: 'Service Orders',
    icon: ClipboardList,
    roles: ['admin', 'manager'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    roles: ['admin', 'technician'],
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    icon: FileText,
    roles: ['admin'],
  },
]

// ── Role display config (badge label + colour) ───────────────────
const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    icon: ShieldCheck,
  },
  technician: {
    label: 'Field Technician',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    icon: TechIcon,
  },
  inventory: {
    label: 'Inventory Manager',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    icon: BarChart2,
  },
  manager: {
    label: 'Ops. Manager',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    icon: Eye,
  },
}

export default function Sidebar({ activePage, setActivePage, user, onLogout }) {
  // Filter nav items to only those allowed for the current role
  const visibleNav = ALL_NAV_ITEMS.filter(item => item.roles.includes(user?.role))

  const rc = ROLE_CONFIG[user?.role] || ROLE_CONFIG.admin
  const RoleIcon = rc.icon

  return (
    <aside className="
      w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800
      flex flex-col h-screen sticky top-0
    ">

      {/* ── Logo / Branding ─────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="ICA Logo"
            className="h-10 w-auto object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-sky-400 uppercase tracking-[0.18em]">ICA</p>
            <p className="text-sm font-extrabold text-slate-100 leading-tight truncate">
              Controls &amp; Automation
            </p>
          </div>
        </div>

        {/* Enterprise badge */}
        <div className="mt-3">
          <span className="inline-flex items-center text-[10px] font-semibold
                           text-slate-500 bg-slate-800/80 border border-slate-700/50
                           rounded-full px-3 py-1 tracking-widest uppercase">
            Enterprise Edition 2026
          </span>
        </div>
      </div>

      {/* ── Logged-in user chip ─────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-800/60">
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${rc.badge}`}>
          <RoleIcon size={14} className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{user?.name}</p>
            <p className="text-[10px] opacity-70 truncate">{rc.label}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation Links ─────────────────────────────────────── */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase
                      tracking-widest px-4 mb-3">
          Navigation
        </p>

        {visibleNav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => setActivePage(id)}
            className={`nav-item w-full text-left ${activePage === id ? 'active' : ''}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {activePage === id && (
              <ChevronRight size={14} className="text-sky-400" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-800 space-y-3">

        {/* Logout */}
        <button
          id="sidebar-logout"
          onClick={onLogout}
          className="
            w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
            text-slate-500 text-sm font-medium
            hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20
            border border-transparent transition-all duration-200
          "
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>

        {/* Copyright */}
        <div className="px-1 text-center space-y-0.5">
          <p className="text-[10px] text-slate-600">© 2026 ICA. All rights reserved.</p>
          <p className="text-[10px] text-slate-700">Systems by SHAK Systems</p>
        </div>

      </div>

    </aside>
  )
}
