/**
 * Inventory.jsx — Full inventory management view
 *
 * Features:
 *  - Technical Search Bar (National Stock Number or part name)
 *  - Category filter tabs
 *  - Data table with Low Stock highlight (qty < 10) in orange
 *  - ✏️ Edit button per row — opens modal to update qty / price / category
 *  - ➕ Add Item button — opens modal to insert a new part
 *  - Toast notifications on save success / error
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, Package, AlertTriangle, Filter, RefreshCw, Plus, Pencil, Trash2, Download } from 'lucide-react'
import { getInventory, searchInventory, updateInventoryItem, createInventoryItem, deleteInventoryItem } from '../services/api.js'
import EditModal, { LockedField, FormField, SelectField } from './EditModal.jsx'
import { useToast, ToastContainer } from './Toast.jsx'

const CATEGORIES   = ['All', 'PLC', 'Sensor', 'Transistor', 'Diode', 'Motor Drive']
const EDIT_CATS    = ['PLC', 'Sensor', 'Transistor', 'Diode', 'Motor Drive']

export default function Inventory({ user }) {
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [searchTerm, setSearchTerm]   = useState('')
  const [category, setCategory]       = useState('All')
  const [isSearching, setIsSearching] = useState(false)

  // Edit modal state
  const [editItem, setEditItem]       = useState(null)   // item being edited (null = closed)
  const [editForm, setEditForm]       = useState({})
  const [editSaving, setEditSaving]   = useState(false)

  // Add modal state
  const [showAdd, setShowAdd]         = useState(false)
  const [addForm, setAddForm]         = useState({ name: '', category: 'PLC', quantity: '', unit_price: '', nsn: '' })
  const [addSaving, setAddSaving]     = useState(false)

  // Delete state
  const [deletingId, setDeletingId]   = useState(null)

  const isAdmin = user?.role === 'admin'

  const { toasts, showToast, dismiss } = useToast()

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchInventory = useCallback((cat = 'All') => {
    setLoading(true)
    setError(null)
    getInventory(cat)
      .then(r => setItems(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchInventory(category) }, [category, fetchInventory])

  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchInventory(category)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => {
      setLoading(true)
      searchInventory(searchTerm)
        .then(r => setItems(r.data))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm, category, fetchInventory])

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEdit = (item) => {
    setEditItem(item)
    setEditForm({
      quantity:   String(item.quantity),
      unit_price: String(item.unit_price),
      category:   item.category,
    })
  }

  const handleEdit = () => {
    const qty   = parseInt(editForm.quantity,  10)
    const price = parseFloat(editForm.unit_price)

    if (isNaN(qty)   || qty < 0)   return showToast('Quantity must be a non-negative integer.', 'error')
    if (isNaN(price) || price <= 0) return showToast('Unit price must be a positive number.', 'error')

    setEditSaving(true)
    updateInventoryItem(editItem.item_id, {
      quantity: qty, unit_price: price, category: editForm.category,
    })
      .then(() => {
        showToast(`Item #${editItem.item_id} updated successfully.`, 'success')
        setEditItem(null)
        fetchInventory(category)
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setEditSaving(false))
  }

  // ── Add handlers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setAddForm({ name: '', category: 'PLC', quantity: '', unit_price: '', nsn: '' })
    setShowAdd(true)
  }

  const handleAdd = () => {
    const qty   = parseInt(addForm.quantity,  10)
    const price = parseFloat(addForm.unit_price)

    if (!addForm.name.trim())        return showToast('Part name is required.', 'error')
    if (!addForm.nsn.trim())         return showToast('NSN is required.', 'error')
    if (isNaN(qty)   || qty < 0)    return showToast('Quantity must be a non-negative integer.', 'error')
    if (isNaN(price) || price <= 0) return showToast('Unit price must be a positive number.', 'error')

    setAddSaving(true)
    createInventoryItem({ ...addForm, quantity: qty, unit_price: price })
      .then(() => {
        showToast('New item added to inventory.', 'success')
        setShowAdd(false)
        fetchInventory(category)
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setAddSaving(false))
  }

  // ── Delete handler ────────────────────────────────────────────────

  const handleDelete = (item) => {
    if (!window.confirm(`Delete "${item.name}" (#${item.item_id})? This cannot be undone.`)) return
    setDeletingId(item.item_id)
    deleteInventoryItem(item.item_id)
      .then(() => {
        showToast(`"${item.name}" deleted from inventory.`, 'success')
        fetchInventory(category)
      })
      .catch(e => showToast(e.response?.data?.error || e.message, 'error'))
      .finally(() => setDeletingId(null))
  }

  // ── CSV Export ──────────────────────────────────────────────────────

  const exportCSV = () => {
    if (!items.length) return showToast('No data to export.', 'error')
    const cols = ['item_id', 'name', 'category', 'nsn', 'quantity', 'unit_price']
    const rows = [cols.join(','),
      ...items.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','))
    ].join('\n')
    const ts  = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a   = Object.assign(document.createElement('a'), { href: url, download: `inventory_${ts}.csv` })
    a.click(); URL.revokeObjectURL(url)
    showToast('CSV exported successfully.', 'success')
  }

  const lowStockCount = items.filter(i => i.quantity > 0 && i.quantity < 10).length
  const outStockCount = items.filter(i => i.quantity === 0).length

  return (
    <div className="space-y-6 animate-slide-up">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Package size={22} className="text-sky-400" />
            Parts Inventory
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            PLCs · Sensors · Transistors · Diodes · Motor Drives
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button id="inventory-add" onClick={openAdd} className="btn-primary">
              <Plus size={14} /> Add Item
            </button>
          )}
          <button id="inventory-export" onClick={exportCSV} className="btn-ghost">
            <Download size={14} /> Export CSV
          </button>
          <button
            id="inventory-refresh"
            onClick={() => { setSearchTerm(''); fetchInventory(category) }}
            className="btn-ghost"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-1">
          <Search size={15} className="text-sky-400" />
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest">
            Fast Lookup — National Stock Number (NSN) / Part Name
          </span>
        </div>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="inventory-search"
            type="text"
            placeholder="Search by part name or National Stock Number (e.g. 5961-23-792-9935)…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input pl-10"
          />
          {searchTerm && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                         hover:text-slate-300 transition-colors text-xs"
              onClick={() => setSearchTerm('')}
            >✕ Clear</button>
          )}
        </div>
        {isSearching && searchTerm && (
          <p className="text-xs text-slate-500 mt-2">
            Showing results for "<span className="text-sky-400">{searchTerm}</span>"
          </p>
        )}
      </div>

      {/* ── Category Tabs ──────────────────────────────────────── */}
      {!isSearching && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-500" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              id={`cat-${cat.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => setCategory(cat)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                ${category === cat
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-sky-500/50 hover:text-sky-400'}
              `}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* ── Stock Alerts ───────────────────────────────────────── */}
      {(lowStockCount > 0 || outStockCount > 0) && !loading && (
        <div className="flex flex-wrap gap-3">
          {outStockCount > 0 && (
            <div className="badge-red px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
              <AlertTriangle size={12} /> {outStockCount} items OUT OF STOCK
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="badge-orange px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
              <AlertTriangle size={12} /> {lowStockCount} items LOW STOCK (&lt;10 units)
            </div>
          )}
        </div>
      )}

      {/* ── Inventory Table ────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {loading ? <LoadingRow /> : error ? <ErrorRow message={error} /> :
         items.length === 0 ? <EmptyRow term={searchTerm} /> : (
          <div className="overflow-x-auto">
            <table className="data-table" id="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Part Name</th>
                  <th>Category</th>
                  <th>NSN (Nat. Stock No.)</th>
                  <th>Qty</th>
                  <th>Unit Price (PKR)</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = item.quantity > 0 && item.quantity < 10
                  const isOut = item.quantity === 0
                  return (
                    <tr key={item.item_id}
                      className={isOut ? 'bg-red-500/5 border-l-2 border-red-500' : isLow ? 'low-stock-row' : ''}>
                      <td className="font-mono text-slate-500 text-xs">#{item.item_id}</td>
                      <td className="font-medium text-slate-200 max-w-xs">{item.name}</td>
                      <td><CategoryBadge cat={item.category} /></td>
                      <td className="font-mono text-xs text-violet-400">{item.nsn}</td>
                      <td>
                        <span className={`font-bold text-sm
                          ${isOut ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-slate-200'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="text-slate-300 font-mono">
                        {Number(item.unit_price).toLocaleString('en-PK', {
                          style: 'currency', currency: 'PKR', maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        {isOut  ? <span className="badge-red">Out of Stock</span> :
                         isLow  ? <span className="badge-orange">⚠ Low Stock</span> :
                                  <span className="badge-green">In Stock</span>}
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              id={`edit-inv-${item.item_id}`}
                              onClick={() => openEdit(item)}
                              title="Edit item"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400
                                         hover:bg-sky-500/10 transition-all duration-200"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              id={`delete-inv-${item.item_id}`}
                              onClick={() => handleDelete(item)}
                              title="Delete item"
                              disabled={deletingId === item.item_id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400
                                         hover:bg-red-500/10 transition-all duration-200
                                         disabled:opacity-40"
                            >
                              {deletingId === item.item_id
                                ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin block" />
                                : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            Showing {items.length} {isSearching ? 'search result' : 'item'}
            {items.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Edit Item Modal ─────────────────────────────────────── */}
      {editItem && (
        <EditModal
          title={`Edit Item — ${editItem.name}`}
          onClose={() => setEditItem(null)}
          onSave={handleEdit}
          saving={editSaving}
        >
          <LockedField label="Item ID"   value={`#${editItem.item_id}`} />
          <LockedField label="Part Name" value={editItem.name} />
          <LockedField label="NSN"       value={editItem.nsn} />
          <SelectField
            label="Category"
            value={editForm.category}
            onChange={v => setEditForm(f => ({ ...f, category: v }))}
            options={EDIT_CATS}
          />
          <FormField
            label="Quantity"
            type="number"
            value={editForm.quantity}
            onChange={v => setEditForm(f => ({ ...f, quantity: v }))}
            placeholder="e.g. 50"
          />
          <FormField
            label="Unit Price (PKR)"
            type="number"
            value={editForm.unit_price}
            onChange={v => setEditForm(f => ({ ...f, unit_price: v }))}
            placeholder="e.g. 1500.00"
          />
        </EditModal>
      )}

      {/* ── Add Item Modal ──────────────────────────────────────── */}
      {showAdd && (
        <EditModal
          title="Add New Inventory Item"
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          saving={addSaving}
          saveLabel="Add Item"
        >
          <FormField
            label="Part Name"
            value={addForm.name}
            onChange={v => setAddForm(f => ({ ...f, name: v }))}
            placeholder="e.g. Siemens S7-1200 PLC"
          />
          <SelectField
            label="Category"
            value={addForm.category}
            onChange={v => setAddForm(f => ({ ...f, category: v }))}
            options={EDIT_CATS}
          />
          <FormField
            label="NSN (National Stock Number)"
            value={addForm.nsn}
            onChange={v => setAddForm(f => ({ ...f, nsn: v }))}
            placeholder="e.g. 5961-00-123-4567"
          />
          <FormField
            label="Quantity"
            type="number"
            value={addForm.quantity}
            onChange={v => setAddForm(f => ({ ...f, quantity: v }))}
            placeholder="e.g. 10"
          />
          <FormField
            label="Unit Price (PKR)"
            type="number"
            value={addForm.unit_price}
            onChange={v => setAddForm(f => ({ ...f, unit_price: v }))}
            placeholder="e.g. 45000"
          />
        </EditModal>
      )}

    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const CAT_COLORS = {
  'PLC':         'badge-blue',
  'Sensor':      'badge-green',
  'Transistor':  'badge-purple',
  'Diode':       'badge-orange',
  'Motor Drive': 'badge-slate',
}

function CategoryBadge({ cat }) {
  return <span className={CAT_COLORS[cat] || 'badge-slate'}>{cat}</span>
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
      Loading inventory…
    </div>
  )
}

function ErrorRow({ message }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3 text-red-400">
      <AlertTriangle size={18} />
      <div>
        <p className="font-semibold">Failed to load inventory</p>
        <p className="text-xs mt-1 text-red-500">{message}</p>
      </div>
    </div>
  )
}

function EmptyRow({ term }) {
  return (
    <div className="py-12 text-center text-slate-500">
      <Package size={32} className="mx-auto mb-3 opacity-30" />
      <p>No items found{term ? ` for "${term}"` : ''}.</p>
    </div>
  )
}
