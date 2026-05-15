/**
 * Maintenance.jsx — Equipment Maintenance Schedule view
 *
 * Shows next_service_date, equipment name, client, and assigned technician.
 * Highlights overdue and upcoming (within 30 days) schedules.
 */

import { useEffect, useState } from 'react'
import { Wrench, Calendar, User, AlertTriangle, CheckCircle, Clock, Plus, RefreshCw } from 'lucide-react'
import { getMaintenance, createMaintenance, getClients } from '../services/api.js'
import EditModal, { FormField, SelectField } from './EditModal.jsx'
import { useToast, ToastContainer } from './Toast.jsx'

export default function Maintenance({ user }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Add schedule state
  const [showAdd, setShowAdd]   = useState(false)
  const [clients, setClients]   = useState([])
  const [addForm, setAddForm]   = useState({
    equipment_name: '', client_id: '', technician_assigned: '', next_service_date: ''
  })
  const [addSaving, setAddSaving] = useState(false)

  const isAdmin = user?.role === 'admin'
  const { toasts, showToast, dismiss } = useToast()

  const reload = () => {
    setLoading(true)
    getMaintenance()
      .then(r => setSchedules(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const openAdd = () => {
    setAddForm({ equipment_name: '', client_id: '', technician_assigned: '', next_service_date: '' })
    setShowAdd(true)
    if (!clients.length) {
      getClients().then(r => setClients(r.data)).catch(() => {})
    }
  }

  const handleAdd = () => {
    if (!addForm.equipment_name.trim())    return showToast('Equipment name is required.', 'error')
    if (!addForm.client_id)                return showToast('Please select a client.', 'error')
    if (!addForm.technician_assigned.trim()) return showToast('Technician name is required.', 'error')
    if (!addForm.next_service_date)        return showToast('Next service date is required.', 'error')
    setAddSaving(true)
    createMaintenance({ ...addForm, client_id: parseInt(addForm.client_id) })
      .then(() => {
        showToast('Maintenance schedule created.', 'success')
        setShowAdd(false)
        reload()
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setAddSaving(false))
  }

  const today = new Date()
  const in30  = new Date(today.getTime() + 30 * 86400000)

  const getUrgency = (dateStr) => {
    const d = new Date(dateStr)
    if (d < today)  return 'overdue'
    if (d <= in30)  return 'upcoming'
    return 'ok'
  }

  const overdueCount  = schedules.filter(s => getUrgency(s.next_service_date) === 'overdue').length
  const upcomingCount = schedules.filter(s => getUrgency(s.next_service_date) === 'upcoming').length

  return (
    <div className="space-y-6 animate-slide-up">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Wrench size={22} className="text-orange-400" />
            Maintenance Schedules
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Preventive maintenance tracking for client equipment
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button id="maintenance-add" onClick={openAdd} className="btn-primary">
              <Plus size={14} /> Add Schedule
            </button>
          )}
          <button id="maintenance-refresh" onClick={reload} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Stats ────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 flex items-center gap-3 border-red-500/20">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{overdueCount}</p>
              <p className="text-xs text-slate-500">Overdue</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3 border-orange-500/20">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock size={16} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-orange-400">{upcomingCount}</p>
              <p className="text-xs text-slate-500">Due in 30 days</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Wrench size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-100">{schedules.length}</p>
              <p className="text-xs text-slate-500">Total Jobs</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Urgency alerts ─────────────────────────────────────── */}
      {overdueCount > 0 && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">
            <span className="font-bold">{overdueCount} maintenance job{overdueCount > 1 ? 's' : ''} overdue!</span>
            &nbsp;Immediate action required.
          </p>
        </div>
      )}

      {/* ── Schedule Table ─────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {loading ? <LoadingRow /> : error ? <ErrorRow message={error} /> : (
          <div className="overflow-x-auto">
            <table className="data-table" id="maintenance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipment</th>
                  <th>Client Name</th>
                  <th>Last Service</th>
                  <th>Next Service</th>
                  <th>Technician</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => {
                  const urgency = getUrgency(s.next_service_date)
                  const rowClass = urgency === 'overdue'
                    ? 'bg-red-500/5 border-l-2 border-red-500'
                    : urgency === 'upcoming'
                    ? 'bg-orange-500/5 border-l-2 border-orange-400'
                    : ''

                  return (
                    <tr key={s.schedule_id} className={rowClass}>
                      <td className="font-mono text-slate-500 text-xs">S-{s.schedule_id}</td>
                      <td className="font-medium text-slate-200">{s.equipment_name}</td>
                      <td className="text-slate-400">
                        {s.Clients?.company_name || s.clients?.company_name || `Client #${s.client_id}`}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {s.last_service_date}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className={
                            urgency === 'overdue' ? 'text-red-400' :
                            urgency === 'upcoming' ? 'text-orange-400' : 'text-slate-500'
                          } />
                          <span className={`font-mono text-xs font-semibold ${
                            urgency === 'overdue' ? 'text-red-400' :
                            urgency === 'upcoming' ? 'text-orange-400' : 'text-slate-300'
                          }`}>
                            {s.next_service_date}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm text-slate-300">
                          <User size={12} className="text-slate-500" />
                          {s.technician_assigned}
                        </div>
                      </td>
                      <td>
                        {urgency === 'overdue'  && <span className="badge-red">Overdue</span>}
                        {urgency === 'upcoming' && <span className="badge-orange">Due Soon</span>}
                        {urgency === 'ok'       && <span className="badge-green">Scheduled</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && schedules.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-500 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
              Due within 30 days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Scheduled
            </span>
          </div>
        )}
      </div>

      {/* ── Technician Summary ───────────────────────────────────── */}
      {!loading && !error && <TechnicianSummary schedules={schedules} />}

      {/* ── Add Schedule Modal ───────────────────────────────────── */}
      {showAdd && (
        <EditModal
          title="New Maintenance Schedule"
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          saving={addSaving}
          saveLabel="Create Schedule"
        >
          <FormField
            label="Equipment Name"
            value={addForm.equipment_name}
            onChange={v => setAddForm(f => ({ ...f, equipment_name: v }))}
            placeholder="e.g. Siemens S7-1500 PLC"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Client
            </label>
            <select
              value={addForm.client_id}
              onChange={e => setAddForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5
                         text-sm text-slate-200 focus:outline-none focus:border-sky-500
                         focus:ring-1 focus:ring-sky-500 transition-all duration-200"
            >
              <option value="">— Select client —</option>
              {clients.map(c => (
                <option key={c.client_id} value={c.client_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <FormField
            label="Technician Assigned"
            value={addForm.technician_assigned}
            onChange={v => setAddForm(f => ({ ...f, technician_assigned: v }))}
            placeholder="e.g. Ali Raza"
          />
          <FormField
            label="Next Service Date"
            type="date"
            value={addForm.next_service_date}
            onChange={v => setAddForm(f => ({ ...f, next_service_date: v }))}
          />
        </EditModal>
      )}

    </div>
  )
}

/* ── Technician workload summary ──────────────────────────────────────────── */

function TechnicianSummary({ schedules }) {
  const techMap = schedules.reduce((acc, s) => {
    acc[s.technician_assigned] = (acc[s.technician_assigned] || 0) + 1
    return acc
  }, {})

  const techs = Object.entries(techMap).sort((a, b) => b[1] - a[1])

  const COLORS = [
    'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
  ]

  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <User size={14} className="text-sky-400" />
        Technician Workload
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {techs.map(([name, count], idx) => (
          <div key={name}
            className={`p-3 rounded-xl border text-center ${COLORS[idx % COLORS.length]}`}>
            <p className="text-lg font-bold">{count}</p>
            <p className="text-xs mt-0.5 font-medium">{name}</p>
            <p className="text-xs opacity-60 mt-0.5">assigned jobs</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Utility rows ─────────────────────────────────────────────────────────── */

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
      Loading schedules…
    </div>
  )
}

function ErrorRow({ message }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3 text-red-400">
      <AlertTriangle size={18} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
