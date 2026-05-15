/**
 * AuditLog.jsx — Admin-only audit trail viewer
 *
 * Displays the 200 most recent data changes across all tables.
 * Supports filtering by table name and action type.
 */

import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, RefreshCw, AlertTriangle, Filter } from 'lucide-react'
import { getAuditLogs } from '../services/api.js'

const ACTION_COLORS = {
  INSERT: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
}

const TABLE_FILTERS  = ['All', 'inventory', 'Service_Orders', 'Clients', 'Maintenance_Schedules']
const ACTION_FILTERS = ['All', 'INSERT', 'UPDATE', 'DELETE']

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tableF, setTableF]   = useState('All')
  const [actionF, setActionF] = useState('All')

  const fetchLogs = useCallback((tf, af) => {
    setLoading(true)
    setError(null)
    const params = {}
    if (tf !== 'All')     params.table  = tf
    if (af !== 'All')     params.action = af
    getAuditLogs(params)
      .then(r => setLogs(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLogs(tableF, actionF) }, [tableF, actionF, fetchLogs])

  const fmt = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck size={22} className="text-sky-400" />
            Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Complete change history — all INSERT, UPDATE, DELETE operations
          </p>
        </div>
        <button
          id="audit-refresh"
          onClick={() => fetchLogs(tableF, actionF)}
          className="btn-ghost"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Table
          </span>
          {TABLE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTableF(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200
                ${tableF === f
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-sky-500/50'}`}
            >{f === 'All' ? 'All Tables' : f}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Action
          </span>
          {ACTION_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActionF(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200
                ${actionF === f
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-sky-500/50'}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* ── Log Table ──────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
            Loading audit logs…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 gap-3 text-red-400">
            <AlertTriangle size={18} />
            <div>
              <p className="font-semibold">Failed to load logs</p>
              <p className="text-xs mt-1 text-red-500">{error}</p>
              <p className="text-xs mt-1 text-slate-500">
                Make sure the <code>audit_logs</code> table exists in Supabase.
              </p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ShieldCheck size={32} className="mx-auto mb-3 opacity-30" />
            <p>No audit entries found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" id="audit-log-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>Changed By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-slate-500 text-xs">{log.id}</td>
                    <td>
                      <span className={ACTION_COLORS[log.action] || 'badge-slate'}>
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-violet-400">{log.table_name}</td>
                    <td className="font-mono text-xs text-slate-400">#{log.record_id}</td>
                    <td>
                      <span className="text-xs bg-slate-800 border border-slate-700
                                       rounded-lg px-2 py-0.5 text-slate-300 font-medium">
                        {log.changed_by}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 font-mono">
                      {fmt(log.changed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && logs.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            Showing {logs.length} most recent entr{logs.length !== 1 ? 'ies' : 'y'}
          </div>
        )}
      </div>

    </div>
  )
}
