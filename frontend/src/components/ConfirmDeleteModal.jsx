import React, { useState, useEffect } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  itemType = 'item',
  itemName = '',
  description = '',
  confirmWord = 'confirm',
  loading = false,
}) {
  const [confirmInput, setConfirmInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const isConfirmed = confirmInput.trim().toLowerCase() === confirmWord.toLowerCase()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isConfirmed && !loading) {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-dropdown border border-gh-border relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gh-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-stone-500 font-normal">
                Permanent deletion safeguard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-xs text-stone-600 leading-relaxed space-y-2">
            <p>
              {description || (
                <>
                  Are you sure you want to delete this {itemType}{' '}
                  {itemName && <strong className="font-semibold text-stone-900">"{itemName}"</strong>}?
                </>
              )}
            </p>
            <p className="text-red-600 text-[11px] font-medium bg-red-50/80 p-2.5 rounded-md border border-red-200/60">
              ⚠️ Warning: This action cascades and permanently removes all related records from the database. It cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-1.5">
              Type <span className="font-mono text-red-600 font-bold bg-stone-100 px-1 py-0.5 rounded border border-stone-200">{confirmWord}</span> to confirm:
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={loading}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`type "${confirmWord}" to enable deletion`}
              className="w-full px-3 py-2 rounded-md border border-gh-border bg-white text-stone-900 text-xs font-mono transition-colors duration-150 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 placeholder:font-sans placeholder:text-stone-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gh-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || loading}
              className="btn-danger flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Delete {itemType}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
