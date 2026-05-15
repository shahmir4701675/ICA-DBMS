/**
 * Dashboard.jsx — Landing page summary view
 *
 * Shows KPI stat cards and quick-access info so the presenter can
 * immediately see the system status at a glance.
 */

import { useEffect, useState } from 'react'
import {
  Package, Users, ClipboardList, Wrench,
  AlertTriangle, CheckCircle, Clock, XCircle,
  TrendingUp, Activity,
} from 'lucide-react'
import { getInventory, getClients, getOrders, getMaintenance } from '../services/api.js'

export default function Dashboard({ setActivePage, user }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    // Fetch all data in parallel to build KPI stats
    Promise.all([
      getInventory(),
      getClients(),
      getOrders(),
      getMaintenance(),
    ])
      .then(([inv, cli, ord, mnt]) => {
        const inventory    = inv.data
        const orders       = ord.data
        const maintenance  = mnt.data

        setStats({
          totalItems:       inventory.length,
          lowStockCount:    inventory.filter(i => i.quantity < 10).length,
          outOfStockCount:  inventory.filter(i => i.quantity === 0).length,
          totalClients:     cli.data.length,
          totalOrders:      orders.length,
          completedOrders:  orders.filter(o => o.status === 'Completed').length,
          pendingOrders:    orders.filter(o => o.status === 'Pending').length,
          inProgressOrders: orders.filter(o => o.status === 'In Progress').length,
          cancelledOrders:  orders.filter(o => o.status === 'Cancelled').length,
          totalRevenue:     orders
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + Number(o.total_cost || 0), 0),
          totalMaintenance: maintenance.length,
          upcomingService:  maintenance.filter(
            m => new Date(m.next_service_date) <= new Date(Date.now() + 30 * 86400000)
          ).length,
          recentOrders:     orders.slice(0, 5),
          recentMaintenance: maintenance.slice(0, 5),
        })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} />

  // ── Role-specific views ────────────────────────────────────────
  if (user?.role === 'technician') return <TechnicianDashboard stats={stats} />
  if (user?.role === 'inventory')  return <InventoryDashboard  stats={stats} setActivePage={setActivePage} />

  const {
    totalItems, lowStockCount, outOfStockCount,
    totalClients, totalOrders, completedOrders, pendingOrders,
    inProgressOrders, cancelledOrders, totalRevenue,
    totalMaintenance, upcomingService,
    recentOrders, recentMaintenance,
  } = stats

  // ── Admin / Manager: full dashboard (unchanged) ────────────────
  return (
    <div className="space-y-8 animate-slide-up">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Operations Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Intelligent Controls &amp; Automation — Live System Overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400
                        bg-emerald-500/10 border border-emerald-500/20
                        rounded-full px-3 py-1.5">
          <Activity size={12} className="animate-pulse" />
          System Online
        </div>
      </div>

      {/* ── Top KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <KpiCard
          label="Total SKUs"
          value={totalItems}
          sub={`${lowStockCount} low stock · ${outOfStockCount} out`}
          icon={Package}
          color="sky"
          alert={lowStockCount > 0}
          onClick={() => setActivePage('inventory')}
        />
        <KpiCard
          label="Corporate Clients"
          value={totalClients}
          sub="Active accounts"
          icon={Users}
          color="violet"
          onClick={() => setActivePage('clients')}
        />
        <KpiCard
          label="Service Orders"
          value={totalOrders}
          sub={`${completedOrders} completed · ${pendingOrders} pending`}
          icon={ClipboardList}
          color="emerald"
          onClick={() => setActivePage('orders')}
        />
        <KpiCard
          label="Maintenance Jobs"
          value={totalMaintenance}
          sub={`${upcomingService} due within 30 days`}
          icon={Wrench}
          color="orange"
          alert={upcomingService > 0}
          onClick={() => setActivePage('maintenance')}
        />
        <KpiCard
          label="Total Revenue"
          value={`PKR ${Number(totalRevenue).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
          sub={`From ${completedOrders} completed orders`}
          icon={TrendingUp}
          color="emerald"
          onClick={() => setActivePage('orders')}
        />

      </div>

      {/* ── Order Status Breakdown ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard icon={CheckCircle} label="Completed" value={completedOrders} variant="green"  />
        <StatusCard icon={Clock}       label="Pending"   value={pendingOrders}   variant="blue"   />
        <StatusCard icon={TrendingUp}  label="In Progress" value={inProgressOrders} variant="purple" />
        <StatusCard icon={XCircle}     label="Cancelled" value={cancelledOrders} variant="red"    />
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent orders */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <ClipboardList size={15} className="text-sky-400" />
            Recent Service Orders
          </h2>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.order_id}
                className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {o.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.Clients?.company_name || o.clients?.company_name} · {o.order_date}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming maintenance */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Wrench size={15} className="text-orange-400" />
            Upcoming Maintenance
          </h2>
          <div className="space-y-2">
            {recentMaintenance.map(m => (
              <div key={m.schedule_id}
                className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">{m.equipment_name}</p>
                  <p className="text-xs text-slate-500">
                    {m.Clients?.company_name || m.clients?.company_name} · Tech: {m.technician_assigned}
                  </p>
                </div>
                <span className="text-xs font-mono text-orange-400">
                  {m.next_service_date}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Low Stock Warning Banner ──────────────────────────────────── */}
      {lowStockCount > 0 && (
        <div className="
          flex items-start gap-3 p-4 rounded-xl
          bg-orange-500/10 border border-orange-500/30
          animate-slide-up
        ">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-300">
              Low Stock Alert
            </p>
            <p className="text-xs text-orange-400/80 mt-0.5">
              {lowStockCount} items have fewer than 10 units in stock
              ({outOfStockCount} are completely out). Visit the Inventory
              tab for details.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

/* ── Role-specific dashboard views ──────────────────────────────────────── */

/**
 * TechnicianDashboard — shows only maintenance workload stats.
 */
function TechnicianDashboard({ stats }) {
  const { totalMaintenance, upcomingService, overdueCount, recentMaintenance } = {
    totalMaintenance: stats.totalMaintenance,
    upcomingService:  stats.upcomingService,
    overdueCount:     0, // calculated below
    recentMaintenance: stats.recentMaintenance,
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">My Maintenance Schedule</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your assigned jobs and upcoming service dates</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Wrench size={18} className="text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{totalMaintenance}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Assigned Jobs</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{upcomingService}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Due Within 30 Days</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Wrench size={15} className="text-orange-400" />
          Upcoming Maintenance
        </h2>
        <div className="space-y-2">
          {recentMaintenance.map(m => (
            <div key={m.schedule_id}
              className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-200">{m.equipment_name}</p>
                <p className="text-xs text-slate-500">
                  {m.Clients?.company_name || m.clients?.company_name} · Tech: {m.technician_assigned}
                </p>
              </div>
              <span className="text-xs font-mono text-orange-400">{m.next_service_date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * InventoryDashboard — shows only stock KPIs and a low-stock alert.
 */
function InventoryDashboard({ stats, setActivePage }) {
  const { totalItems, lowStockCount, outOfStockCount } = stats

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Stock Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">Live inventory health — alerts and item counts</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card cursor-pointer" onClick={() => setActivePage('inventory')}>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Package size={18} className="text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{totalItems}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total SKUs</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">{lowStockCount}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Low Stock (&lt;10)</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{outOfStockCount}</p>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Out of Stock</p>
        </div>
      </div>

      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-300">Restocking Required</p>
            <p className="text-xs text-orange-400/80 mt-0.5">
              {lowStockCount} items below threshold · {outOfStockCount} completely out of stock.
              Visit the Inventory tab to review.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, icon: Icon, color, alert, onClick }) {
  const colorMap = {
    sky:     'text-sky-400    bg-sky-500/10    border-sky-500/20    shadow-sky-500/10',
    violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20 shadow-violet-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    orange:  'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-orange-500/10',
  }
  const cls = colorMap[color]

  return (
    <button
      id={`kpi-${label.replace(/\s+/g, '-').toLowerCase()}`}
      onClick={onClick}
      className={`
        stat-card text-left group cursor-pointer
        hover:shadow-xl transition-shadow duration-300
        ${alert ? 'border-orange-500/30' : ''}
      `}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-600 mt-1">{sub}</p>
      </div>
    </button>
  )
}

function StatusCard({ icon: Icon, label, value, variant }) {
  const variantMap = {
    green:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:   'text-sky-400     bg-sky-500/10     border-sky-500/20',
    purple: 'text-violet-400  bg-violet-500/10  border-violet-500/20',
    red:    'text-red-400     bg-red-500/10     border-red-500/20',
  }
  return (
    <div className={`glass-card p-4 flex items-center gap-3 border ${variantMap[variant]}`}>
      <Icon size={18} />
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    'Completed':   'badge-green',
    'Pending':     'badge-blue',
    'In Progress': 'badge-purple',
    'Cancelled':   'badge-red',
  }
  return <span className={map[status] || 'badge-slate'}>{status}</span>
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
      <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
      Loading dashboard data…
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex items-center justify-center h-64 text-red-400 gap-3">
      <AlertTriangle size={20} />
      <div>
        <p className="font-semibold">Failed to load data</p>
        <p className="text-xs text-red-500 mt-1">{message}</p>
        <p className="text-xs text-slate-500 mt-1">
          Make sure the Flask backend is running on port 5000.
        </p>
      </div>
    </div>
  )
}
