/**
 * EditModal.jsx — Reusable modal wrapper for edit forms
 *
 * Props:
 *   title      (string)   - modal heading
 *   onClose    (fn)       - called on backdrop click / Escape / Cancel
 *   onSave     (fn)       - called on Save button click
 *   saving     (bool)     - shows spinner on Save button
 *   saveLabel  (string)   - default "Save Changes"
 *   children   (node)     - form contents
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save } from 'lucide-react'

export default function EditModal({
  title,
  onClose,
  onSave,
  saving = false,
  saveLabel = 'Save Changes',
  children,
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-box max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-slate-700/50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200
                       hover:bg-slate-700 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white
                          rounded-full animate-spin" />Saving…</>
              : <><Save size={14} />{saveLabel}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Shared form field components ─────────────────────────────────────────── */

/** A read-only display field (locked — not editable) */
export function LockedField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase
                         tracking-widest mb-1.5">
        {label}
        <span className="ml-2 text-slate-600 normal-case font-normal">(read-only)</span>
      </label>
      <div className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg
                      px-3 py-2.5 text-sm text-slate-500 font-mono">
        {value}
      </div>
    </div>
  )
}

/** An editable text / number input field */
export function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase
                         tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5
                   text-sm text-slate-200 placeholder-slate-600
                   focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                   transition-all duration-200"
      />
    </div>
  )
}

/** A <select> dropdown field */
export function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase
                         tracking-widest mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5
                   text-sm text-slate-200
                   focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                   transition-all duration-200"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
