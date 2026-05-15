/**
 * Orders.jsx — Engineering Service Orders management
 *
 * Features:
 *  - Status filter tabs (All | Pending | In Progress | Completed | Cancelled)
 *  - Invoice Toggle button on Completed orders → opens printable modal
 *  - Invoice modal with full formatted invoice layout
 */

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList, FileText, X, Printer,
  AlertTriangle, CheckCircle, Clock, TrendingUp, XCircle,
  Pencil, Plus, RefreshCw, Download,
} from 'lucide-react'
import { getOrders, generateInvoice, updateOrderStatus, createOrder, getClients } from '../services/api.js'
import EditModal, { LockedField, SelectField, FormField } from './EditModal.jsx'
import { useToast, ToastContainer } from './Toast.jsx'

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled']

export default function Orders({ user }) {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [statusFilter, setStatus] = useState('All')
  const [clientSearch, setClientSearch] = useState('')
  const isAdmin = user?.role === 'admin'

  // Invoice modal state
  const [invoice, setInvoice]         = useState(null)
  const [invoiceLoading, setInvLoad]  = useState(false)
  const [invoiceError, setInvError]   = useState(null)
  const [showModal, setShowModal]     = useState(false)

  // Status-edit state
  const [editOrder, setEditOrder]     = useState(null)   // order being status-edited
  const [newStatus, setNewStatus]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  // Add order state
  const [showAdd, setShowAdd]         = useState(false)
  const [clients, setClients]         = useState([])
  const [addForm, setAddForm]         = useState({ description: '', client_id: '', total_cost: '', status: 'Pending' })
  const [addSaving, setAddSaving]     = useState(false)

  const { toasts, showToast, dismiss } = useToast()

  // ─── Popup-window print (bypasses all CSS @media print issues) ───────────
  const handlePrint = () => {
    const el = document.getElementById('invoice-print-area')
    if (!el) return

    const popup = window.open('', '_blank', 'width=900,height=700')
    popup.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            padding: 36px 40px;
            font-size: 13px;
          }
          /* Company header */
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start;
                        border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 18px; }
          .inv-company-name { font-size: 18px; font-weight: 800; color: #1e3a5f; margin-bottom: 4px; }
          .inv-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .inv-number { font-size: 22px; font-weight: 900; color: #111827; text-align: right; }
          .inv-badge { display: inline-block; border: 1px solid #475569; border-radius: 999px;
                       padding: 2px 12px; font-size: 10px; font-weight: 700; color: #1e293b;
                       background: #f1f5f9; margin-top: 6px; }
          /* Bill to / Order details */
          .inv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; }
          .inv-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
                       color: #9ca3af; margin-bottom: 6px; }
          .inv-bold { font-weight: 700; color: #111827; margin-bottom: 2px; }
          .inv-normal { color: #374151; margin-bottom: 2px; }
          .inv-mono { font-family: monospace; font-size: 11px; color: #6b7280; }
          /* Table */
          table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;
                  margin-bottom: 18px; }
          thead tr { background: #f1f5f9; }
          thead th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700;
                     text-transform: uppercase; letter-spacing: 0.08em; color: #374151;
                     border-bottom: 1px solid #cbd5e1; }
          thead th:last-child { text-align: right; }
          tbody tr { border-bottom: 1px solid #e2e8f0; }
          tbody td { padding: 10px 14px; color: #374151; }
          tbody td:last-child { text-align: right; font-family: monospace; }
          .total-row { background: #f0f4f8; }
          .total-row td { font-weight: 700; color: #1e3a5f; font-size: 14px; }
          /* Footer */
          .inv-footer { border-top: 1px solid #e2e8f0; padding-top: 12px;
                        text-align: center; font-size: 11px; color: #9ca3af; }
          @page { size: A4 portrait; margin: 12mm 14mm; }
        </style>
      </head>
      <body>
        <div class="inv-header">
          <div>
            <div class="inv-company-name">${el.querySelector('.invoice-company-name')?.textContent || ''}</div>
            ${Array.from(el.querySelectorAll('.invoice-header-section .text-xs'))
                .map(p => `<div class="inv-meta">${p.textContent}</div>`).join('')}
          </div>
          <div style="text-align:right">
            <div class="inv-number">${el.querySelector('.text-2xl.font-black')?.textContent || ''}</div>
            <div class="inv-meta">${el.querySelector('.text-xs.text-slate-500')?.textContent || ''}</div>
            <div class="inv-badge">${el.querySelector('.invoice-payment-badge')?.textContent || ''}</div>
          </div>
        </div>
        <div class="inv-grid">
          <div>
            <div class="inv-label">Bill To</div>
            ${Array.from(el.querySelectorAll('.grid .col-start-1 p, .grid > div:first-child p'))
                .map(p => `<div class="${
                  p.classList.contains('font-bold') ? 'inv-bold' :
                  p.classList.contains('font-mono') ? 'inv-mono' : 'inv-normal'
                }">${p.textContent}</div>`).join('')}
          </div>
          <div>
            <div class="inv-label">Order Details</div>
            ${Array.from(el.querySelectorAll('.grid > div:last-child p'))
                .map(p => `<div class="${
                  p.classList.contains('font-medium') ? 'inv-bold' :
                  p.classList.contains('font-mono') ? 'inv-mono' : 'inv-normal'
                }">${p.textContent}</div>`).join('')}
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Description</th><th>Amount (PKR)</th>
          </tr></thead>
          <tbody>
            ${Array.from(el.querySelectorAll('tbody tr')).map((row, i, arr) => {
              const cells = row.querySelectorAll('td')
              const isTotal = row.classList.contains('invoice-total-row')
              return `<tr class="${isTotal ? 'total-row' : ''}">
                <td>${cells[0]?.textContent || ''}</td>
                <td>${cells[1]?.textContent || ''}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
        <div class="inv-footer">${el.querySelector('.invoice-footer-section')?.textContent || ''}</div>
      </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    setTimeout(() => { popup.print(); popup.close() }, 400)
  }

  const fetchOrders = useCallback((stat) => {
    setLoading(true)
    setError(null)
    getOrders(stat)
      .then(r => setOrders(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchOrders(statusFilter) }, [statusFilter, fetchOrders])

  // ── Status edit handlers ──────────────────────────────────────────────────

  const openStatusEdit = (order) => {
    setEditOrder(order)
    setNewStatus(order.status)
  }

  const handleStatusSave = () => {
    if (!newStatus) return
    setEditSaving(true)
    updateOrderStatus(editOrder.order_id, newStatus)
      .then(() => {
        showToast(`Order #${editOrder.order_id} status → ${newStatus}`, 'success')
        setEditOrder(null)
        fetchOrders(statusFilter)
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setEditSaving(false))
  }

  // ── Add order handlers ────────────────────────────────────────────────────

  const openAdd = () => {
    setAddForm({ description: '', client_id: '', total_cost: '', status: 'Pending' })
    setShowAdd(true)
    if (!clients.length) {
      getClients().then(r => setClients(r.data)).catch(() => {})
    }
  }

  const handleAddOrder = () => {
    if (!addForm.description.trim()) return showToast('Description is required.', 'error')
    if (!addForm.client_id)          return showToast('Please select a client.', 'error')
    const cost = parseFloat(addForm.total_cost)
    if (isNaN(cost) || cost < 0)     return showToast('Total cost must be a non-negative number.', 'error')

    setAddSaving(true)
    createOrder({ ...addForm, client_id: parseInt(addForm.client_id), total_cost: cost })
      .then(() => {
        showToast('New service order created.', 'success')
        setShowAdd(false)
        fetchOrders(statusFilter)
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setAddSaving(false))
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const data = filteredOrders
    if (!data.length) return showToast('No data to export.', 'error')
    const cols = ['order_id', 'description', 'order_date', 'total_cost', 'status']
    const rows = [cols.join(','),
      ...data.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','))
    ].join('\n')
    const ts  = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a   = Object.assign(document.createElement('a'), { href: url, download: `orders_${ts}.csv` })
    a.click(); URL.revokeObjectURL(url)
    showToast('Orders CSV exported.', 'success')
  }

  // Client-name / description filter (client-side on loaded orders)
  const filteredOrders = clientSearch.trim()
    ? orders.filter(o =>
        (o.Clients?.company_name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
        (o.description || '').toLowerCase().includes(clientSearch.toLowerCase())
      )
    : orders

  // Generate and display invoice for a completed order
  const handleInvoice = (orderId) => {
    setInvoice(null)
    setInvError(null)
    setInvLoad(true)
    setShowModal(true)

    generateInvoice(orderId)
      .then(r => setInvoice(r.data))
      .catch(e => setInvError(e.response?.data?.error || e.message))
      .finally(() => setInvLoad(false))
  }

  const closeModal = () => {
    setShowModal(false)
    setInvoice(null)
    setInvError(null)
  }

  const STATUS_ICON = {
    'Completed':   <CheckCircle  size={14} className="text-emerald-400" />,
    'Pending':     <Clock        size={14} className="text-sky-400" />,
    'In Progress': <TrendingUp   size={14} className="text-violet-400" />,
    'Cancelled':   <XCircle      size={14} className="text-red-400" />,
  }
  const STATUS_BADGE = {
    'Completed':   'badge-green',
    'Pending':     'badge-blue',
    'In Progress': 'badge-purple',
    'Cancelled':   'badge-red',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList size={22} className="text-emerald-400" />
            Service Orders
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Engineering service orders — click Invoice on any Completed order
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button id="orders-add" onClick={openAdd} className="btn-primary">
              <Plus size={14} /> New Order
            </button>
          )}
          <button id="orders-export" onClick={exportCSV} className="btn-ghost">
            <Download size={14} /> Export CSV
          </button>
          <button id="orders-refresh" onClick={() => fetchOrders(statusFilter)} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Client / description search ────────────────────────────── */}
      <div className="relative">
        <input
          id="orders-search"
          type="text"
          placeholder="Search by client name or description…"
          value={clientSearch}
          onChange={e => setClientSearch(e.target.value)}
          className="search-input pl-4"
        />
        {clientSearch && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                       hover:text-slate-300 text-xs"
            onClick={() => setClientSearch('')}
          >✕ Clear</button>
        )}
      </div>

      {/* ── Status Filter Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => {
          const colors = {
            'All':         'bg-slate-500',
            'Pending':     'bg-sky-500',
            'In Progress': 'bg-violet-500',
            'Completed':   'bg-emerald-500',
            'Cancelled':   'bg-red-500',
          }
          return (
            <button
              key={s}
              id={`order-filter-${s.toLowerCase().replace(' ', '-')}`}
              onClick={() => setStatus(s)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${statusFilter === s
                  ? `${colors[s]} text-white shadow-lg`
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}
              `}
            >
              {s}
            </button>
          )
        })}
      </div>

      {/* ── Orders Table ───────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <LoadingRow />
        ) : error ? (
          <ErrorRow message={error} />
        ) : filteredOrders.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" id="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Client Name</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Total Cost (PKR)</th>
                  <th>Status</th>
                  <th>Invoice</th>
                  {isAdmin && <th>Edit</th>}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.order_id}>
                    <td className="font-mono text-slate-500 text-xs">
                      #{o.order_id}
                    </td>
                    <td className="font-medium text-slate-200">
                      {o.Clients?.company_name || o.clients?.company_name || `Client #${o.client_id}`}
                    </td>
                    <td className="text-slate-300">{o.description}</td>
                    <td className="font-mono text-xs text-slate-400">{o.order_date}</td>
                    <td className="font-mono font-semibold text-slate-200">
                      {Number(o.total_cost).toLocaleString('en-PK', {
                        style: 'currency', currency: 'PKR', maximumFractionDigits: 2
                      })}
                    </td>
                    <td>
                      <span className={`${STATUS_BADGE[o.status] || 'badge-slate'} flex items-center gap-1 w-fit`}>
                        {STATUS_ICON[o.status]}
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {o.status === 'Completed' ? (
                        <button
                          id={`invoice-btn-${o.order_id}`}
                          onClick={() => handleInvoice(o.order_id)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          <FileText size={12} />
                          Invoice
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          id={`edit-order-${o.order_id}`}
                          onClick={() => openStatusEdit(o)}
                          title="Change status"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400
                                     hover:bg-emerald-500/10 transition-all duration-200"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} · Filter:&nbsp;
            <span className="text-slate-400">{statusFilter}</span>
          </div>
        )}
      </div>

      {/* ── Invoice Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" id="invoice-modal" onClick={e => { if(e.target === e.currentTarget) closeModal() }}>
          <div className="modal-box">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-6 no-print">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-sky-400" />
                Service Invoice
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-ghost text-xs">
                  <Printer size={13} /> Print
                </button>
                <button id="invoice-close" onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            {invoiceLoading && (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                Generating invoice…
              </div>
            )}

            {invoiceError && (
              <div className="flex items-center gap-3 text-red-400 p-4 bg-red-500/10 rounded-xl">
                <AlertTriangle size={16} />
                <p className="text-sm">{invoiceError}</p>
              </div>
            )}

            {invoice && <InvoiceDocument invoice={invoice} />}

          </div>
        </div>
      )}

      {/* ── Status Edit Modal ───────────────────────────────────── */}
      {editOrder && (
        <EditModal
          title={`Change Status — Order #${editOrder.order_id}`}
          onClose={() => setEditOrder(null)}
          onSave={handleStatusSave}
          saving={editSaving}
          saveLabel="Update Status"
        >
          <LockedField label="Order ID"    value={`#${editOrder.order_id}`} />
          <LockedField label="Description" value={editOrder.description} />
          <LockedField label="Client"      value={editOrder.Clients?.company_name || `Client #${editOrder.client_id}`} />
          <SelectField
            label="New Status"
            value={newStatus}
            onChange={setNewStatus}
            options={['Pending', 'In Progress', 'Completed', 'Cancelled']}
          />
        </EditModal>
      )}

      {/* ── Add Order Modal ─────────────────────────────────────── */}
      {showAdd && (
        <EditModal
          title="New Service Order"
          onClose={() => setShowAdd(false)}
          onSave={handleAddOrder}
          saving={addSaving}
          saveLabel="Create Order"
        >
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
            label="Description"
            value={addForm.description}
            onChange={v => setAddForm(f => ({ ...f, description: v }))}
            placeholder="e.g. PLC Calibration & Overhaul"
          />
          <FormField
            label="Total Cost (PKR)"
            type="number"
            value={addForm.total_cost}
            onChange={v => setAddForm(f => ({ ...f, total_cost: v }))}
            placeholder="e.g. 85000"
          />
          <SelectField
            label="Initial Status"
            value={addForm.status}
            onChange={v => setAddForm(f => ({ ...f, status: v }))}
            options={['Pending', 'In Progress', 'Completed', 'Cancelled']}
          />
        </EditModal>
      )}

    </div>
  )
}

/* ── Invoice Document Component ──────────────────────────────────────────── */

function InvoiceDocument({ invoice: iv }) {
  const paymentColor = iv.invoice.payment_status === 'Paid' ? 'badge-green' : 'badge-orange'

  return (
    <div id="invoice-print-area" className="space-y-6 text-slate-300 text-sm">

      {/* Company header */}
      <div className="invoice-header-section border-b border-slate-700 pb-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="invoice-company-name text-xl font-bold text-sky-400">{iv.company.name}</p>
            <p className="text-xs text-slate-500 mt-1">{iv.company.address}</p>
            <p className="text-xs text-slate-500">{iv.company.phone} · {iv.company.email}</p>
            <p className="text-xs text-slate-600 mt-1">NTN: {iv.company.ntn}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-100">{iv.invoice_number}</p>
            <p className="text-xs text-slate-500 mt-1">Generated: {iv.generated_on}</p>
            <span className={`invoice-payment-badge ${paymentColor} mt-2 inline-block`}>
              {iv.invoice.payment_status}
            </span>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Bill To</p>
          <p className="font-bold text-slate-100">{iv.client.company_name}</p>
          <p className="text-slate-400">{iv.client.contact_person}</p>
          <p className="text-xs text-slate-500 font-mono">{iv.client.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Order Details</p>
          <p className="text-slate-400">Order #{iv.order.id}</p>
          <p className="font-medium text-slate-200">{iv.order.description}</p>
          <p className="text-xs text-slate-500 font-mono">Date: {iv.order.order_date}</p>
          {iv.invoice.invoice_date && (
            <p className="text-xs text-slate-500 font-mono">Invoice: {iv.invoice.invoice_date}</p>
          )}
        </div>
      </div>

      {/* Cost breakdown table */}
      <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700/60 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700/40">
              <td className="px-4 py-3 text-slate-300">{iv.order.description}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-200">
                {iv.invoice.subtotal.toLocaleString('en-PK')}
              </td>
            </tr>
            <tr className="border-b border-slate-700/40">
              <td className="px-4 py-3 text-slate-400">GST ({iv.invoice.tax_percent}%)</td>
              <td className="px-4 py-3 text-right font-mono text-slate-400">
                {iv.invoice.tax_amount.toLocaleString('en-PK')}
              </td>
            </tr>
            <tr className="invoice-total-row bg-sky-500/10">
              <td className="px-4 py-3 font-bold text-slate-100">Total Due</td>
              <td className="px-4 py-3 text-right font-bold font-mono text-sky-400 text-lg">
                PKR {iv.invoice.total_due.toLocaleString('en-PK')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="invoice-footer-section text-center text-xs text-slate-600 border-t border-slate-700/50 pt-4">
        Thank you for your business · Intelligent Controls &amp; Automation
      </div>

    </div>
  )
}

/* ── Utility rows ─────────────────────────────────────────────────────────── */

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
      Loading orders…
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

function EmptyRow() {
  return (
    <div className="py-12 text-center text-slate-500">
      <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
      <p>No orders found for the selected filter.</p>
    </div>
  )
}
