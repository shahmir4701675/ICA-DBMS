/**
 * Clients.jsx — Corporate clients directory
 *
 * Features:
 *  - Card grid layout
 *  - ✏️ Edit button per card — updates contact_person and email
 *  - ➕ Add Client button
 *  - Toast notifications
 */

import { useEffect, useState, useCallback } from 'react'
import { Users, Mail, User, AlertTriangle, Building2, Pencil, Plus, RefreshCw, Search } from 'lucide-react'
import { getClients, updateClient, createClient } from '../services/api.js'
import EditModal, { LockedField, FormField } from './EditModal.jsx'
import { useToast, ToastContainer } from './Toast.jsx'

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const isAdmin = user?.role === 'admin'

  // Edit state
  const [editClient, setEditClient]   = useState(null)
  const [editForm, setEditForm]       = useState({ contact_person: '', email: '' })
  const [editSaving, setEditSaving]   = useState(false)

  // Add state
  const [showAdd, setShowAdd]         = useState(false)
  const [addForm, setAddForm]         = useState({ company_name: '', contact_person: '', email: '' })
  const [addSaving, setAddSaving]     = useState(false)

  const { toasts, showToast, dismiss } = useToast()

  const fetchClients = useCallback(() => {
    setLoading(true)
    setError(null)
    getClients()
      .then(r => setClients(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEdit = (client) => {
    setEditClient(client)
    setEditForm({ contact_person: client.contact_person, email: client.email })
  }

  const handleEdit = () => {
    if (!editForm.contact_person.trim()) return showToast('Contact person cannot be empty.', 'error')
    if (!editForm.email.includes('@'))   return showToast('Invalid email address.', 'error')

    setEditSaving(true)
    updateClient(editClient.client_id, editForm)
      .then(() => {
        showToast(`${editClient.company_name} updated successfully.`, 'success')
        setEditClient(null)
        fetchClients()
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setEditSaving(false))
  }

  // ── Add handlers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setAddForm({ company_name: '', contact_person: '', email: '' })
    setShowAdd(true)
  }

  const handleAdd = () => {
    if (!addForm.company_name.trim())   return showToast('Company name is required.', 'error')
    if (!addForm.contact_person.trim()) return showToast('Contact person is required.', 'error')
    if (!addForm.email.includes('@'))   return showToast('Invalid email address.', 'error')

    setAddSaving(true)
    createClient(addForm)
      .then(() => {
        showToast('New client added successfully.', 'success')
        setShowAdd(false)
        fetchClients()
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setAddSaving(false))
  }

  // Corporate accent colours
  const CLIENT_ACCENTS = [
    'from-sky-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-rose-500 to-pink-600',
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users size={22} className="text-violet-400" />
            Corporate Clients
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Key industrial accounts serviced by ICA
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button id="clients-add" onClick={openAdd} className="btn-primary">
              <Plus size={14} /> Add Client
            </button>
          )}
          <button id="clients-refresh" onClick={fetchClients} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading && <LoadingCards />}
      {error   && <ErrorState message={error} />}

      {/* ── Search Input ────────────────────────────────────── */}
      {!loading && !error && (
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="clients-search"
            type="text"
            placeholder="Search by company name or contact person…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input pl-10"
          />
          {search && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                         hover:text-slate-300 text-xs"
              onClick={() => setSearch('')}
            >✕ Clear</button>
          )}
        </div>
      )}

      {/* ── Client Cards Grid ─────────────────────────────────── */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clients
              .filter(c =>
                !search.trim() ||
                c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
                c.contact_person?.toLowerCase().includes(search.toLowerCase())
              )
              .map((client, idx) => (
              <div
                key={client.client_id}
                id={`client-${client.client_id}`}
                className="glass-card p-5 hover:border-slate-600/70
                           transition-all duration-300 group"
              >
                {/* Gradient avatar */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  bg-gradient-to-br ${CLIENT_ACCENTS[idx % CLIENT_ACCENTS.length]}
                  shadow-lg mb-4
                `}>
                  <Building2 size={22} className="text-white" />
                </div>

                {/* Client info */}
                <h3 className="font-bold text-slate-100 text-base leading-tight">
                  {client.company_name}
                </h3>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <User size={13} className="text-slate-500 flex-shrink-0" />
                    <span>{client.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail size={13} className="text-slate-500 flex-shrink-0" />
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-sky-400 transition-colors text-xs font-mono"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>

                {/* Footer row: ID badge + Edit button */}
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-mono">
                    Client #{client.client_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="badge-green text-xs">Active</span>
                    {isAdmin && (
                      <button
                        id={`edit-client-${client.client_id}`}
                        onClick={() => openEdit(client)}
                        title="Edit contact info"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400
                                   hover:bg-violet-500/10 transition-all duration-200"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="glass-card p-4 flex items-center gap-3">
            <Users size={16} className="text-violet-400" />
            <p className="text-sm text-slate-400">
              <span className="font-bold text-slate-200">{clients.length}</span> active
              corporate accounts · All receiving ongoing industrial automation support.
            </p>
          </div>
        </>
      )}

      {/* ── Edit Client Modal ───────────────────────────────────── */}
      {editClient && (
        <EditModal
          title={`Edit — ${editClient.company_name}`}
          onClose={() => setEditClient(null)}
          onSave={handleEdit}
          saving={editSaving}
        >
          <LockedField label="Client ID"    value={`#${editClient.client_id}`} />
          <LockedField label="Company Name" value={editClient.company_name} />
          <FormField
            label="Contact Person"
            value={editForm.contact_person}
            onChange={v => setEditForm(f => ({ ...f, contact_person: v }))}
            placeholder="e.g. Ahmad Raza"
          />
          <FormField
            label="Email Address"
            type="email"
            value={editForm.email}
            onChange={v => setEditForm(f => ({ ...f, email: v }))}
            placeholder="e.g. contact@company.com"
          />
        </EditModal>
      )}

      {/* ── Add Client Modal ────────────────────────────────────── */}
      {showAdd && (
        <EditModal
          title="Add New Client"
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          saving={addSaving}
          saveLabel="Add Client"
        >
          <FormField
            label="Company Name"
            value={addForm.company_name}
            onChange={v => setAddForm(f => ({ ...f, company_name: v }))}
            placeholder="e.g. Fauji Fertilizer Co."
          />
          <FormField
            label="Contact Person"
            value={addForm.contact_person}
            onChange={v => setAddForm(f => ({ ...f, contact_person: v }))}
            placeholder="e.g. Bilal Khan"
          />
          <FormField
            label="Email Address"
            type="email"
            value={addForm.email}
            onChange={v => setAddForm(f => ({ ...f, email: v }))}
            placeholder="e.g. bilal@fauji.com"
          />
        </EditModal>
      )}

    </div>
  )
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="glass-card p-5 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-slate-700 mb-4" />
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
          <div className="h-3 bg-slate-700/70 rounded w-full mb-2" />
          <div className="h-3 bg-slate-700/70 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex items-center gap-3 text-red-400 p-5">
      <AlertTriangle size={18} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
