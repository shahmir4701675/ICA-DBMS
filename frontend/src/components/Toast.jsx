/**
 * Toast.jsx — lightweight in-app toast notification system
 *
 * Usage:
 *   const { toasts, showToast } = useToast()
 *   <ToastContainer toasts={toasts} />
 *   showToast('Saved!', 'success')
 *   showToast('Error message', 'error')
 */

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

let _id = 0

/** Hook — returns { toasts, showToast } */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, dismiss }
}

/** Renders all active toasts in the top-right corner */
export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
            border text-sm font-medium min-w-[260px] max-w-[360px]
            animate-modal-in
            ${t.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/90 border-red-500/40 text-red-300'}
          `}
        >
          {t.type === 'success'
            ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            : <XCircle    size={16} className="text-red-400 flex-shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
