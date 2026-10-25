import React, { useState, useEffect } from 'react'
import { AlertCircle, X, Loader2 } from 'lucide-react'

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
        <div className="flex items-start justify-between pb-3.5 border-b border-gh-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 border border-stone-200">
              <AlertCircle className="w-4 h-4 text-stone-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-stone-400 font-normal">
                Please confirm deletion
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
          <div className="text-xs text-stone-600 leading-relaxed">
            <p>
              {description || (
                <>
                  Are you sure you want to delete {itemType.toLowerCase()}{' '}
                  {itemName && <strong className="font-semibold text-stone-900">"{itemName}"</strong>}?
                </>
              )}
            </p>
          </div>

          {/* Clean Non-Technical Warning Note */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-200/80 text-stone-600 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-medium text-stone-700">Irreversible • No backup or undo available</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-1.5">
              Type <span className="font-mono text-stone-800 font-semibold bg-stone-100 px-1 py-0.5 rounded border border-stone-200">{confirmWord}</span> to confirm:
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={loading}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`type "${confirmWord}" to proceed`}
              className="w-full px-3 py-2 rounded-md border border-gh-border bg-white text-stone-900 text-xs font-mono transition-colors duration-150 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 placeholder:font-sans placeholder:text-stone-400"
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
