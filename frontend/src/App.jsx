/**
 * App.jsx — Root component for ICA DBMS
 *
 * Auth gate: null user → Login page.
 * Stores the full user object { email, role, name, defaultPage } in state.
 * Passes `user` to Sidebar (for role-filtered nav) and pages (for role-aware content).
 */

import { useState } from 'react'
import { setAuthRole } from './services/api.js'
import Login       from './components/Login.jsx'
import Sidebar     from './components/Sidebar.jsx'
import Dashboard   from './components/Dashboard.jsx'
import Inventory   from './components/Inventory.jsx'
import Clients     from './components/Clients.jsx'
import Orders      from './components/Orders.jsx'
import Maintenance from './components/Maintenance.jsx'
import AuditLog    from './components/AuditLog.jsx'

export default function App() {
  // null = not logged in; otherwise holds the matched user object from Login
  const [user, setUser]           = useState(null)
  const [activePage, setActivePage] = useState('dashboard')

  // ── Not logged in → show Login screen only ────────────────────
  if (!user) {
    return (
      <Login
        onSuccess={(matchedUser) => {
          setUser(matchedUser)
          setActivePage(matchedUser.defaultPage)
          setAuthRole(matchedUser.role)  // inject X-User-Role header for all API calls
        }}
      />
    )
  }

  // ── Authenticated → full layout ───────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <Dashboard   setActivePage={setActivePage} user={user} />
      case 'inventory':   return <Inventory   user={user} />
      case 'clients':     return <Clients     user={user} />
      case 'orders':      return <Orders      user={user} />
      case 'maintenance': return <Maintenance user={user} />
      case 'audit-log':   return <AuditLog />
      default:            return <Dashboard   setActivePage={setActivePage} user={user} />
    }
  }

  const handleLogout = () => {
    setUser(null)
    setActivePage('dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">

      {/* Sidebar — receives user for role-based nav filtering */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main content — scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fade-in min-h-full">
          {renderPage()}
        </div>
      </main>

    </div>
  )
}
