import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { getAvatarInitials, getAvatarColorClass } from '../../lib/avatar'

export default function StyledSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  searchable = false,
  align = 'left',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Find currently selected option object
  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const isFiltered = Boolean(value !== '' && value !== undefined && value !== null)

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard accessibility (Escape key)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, searchable])

  // Filter options by search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const l = (opt.label || '').toLowerCase()
    const s = (opt.subtitle || '').toLowerCase()
    return l.includes(q) || s.includes(q)
  })

  const handleSelect = (val) => {
    onChange?.(val)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange?.('')
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
          {Icon && <Icon className="w-3 h-3 text-stone-400" />}
          <span>{label}</span>
          {isFiltered && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 py-1.5 px-2.5 text-xs rounded-lg border transition-all duration-150 text-left select-none shadow-2xs ${
          disabled
            ? 'bg-stone-50/80 border-stone-200/60 text-stone-400 cursor-not-allowed opacity-60'
            : isFiltered
            ? 'bg-emerald-50/25 border-emerald-500/40 text-stone-900 hover:border-emerald-500/60 font-medium'
            : 'bg-white border-stone-200/90 text-stone-700 hover:border-stone-300 hover:bg-stone-50/40'
        } ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500/50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Status Dot / Avatar if selected */}
          {selectedOption?.dot && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dot}`} />
          )}
          {selectedOption?.devName && (
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${getAvatarColorClass(
                selectedOption.devName
              )}`}
            >
              {getAvatarInitials(selectedOption.devName)}
            </span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-stone-400">
          {isFiltered && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-stone-200/60 hover:text-stone-700 transition-colors cursor-pointer"
              title="Reset selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-stone-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Menu Popover */}
      {isOpen && !disabled && (
        <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 w-full min-w-[200px] max-w-xs z-50 bg-white border border-stone-200/90 rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100`}>
          {/* Micro Search Input if searchable */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-stone-100 bg-stone-50/50">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-xs rounded-md border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-2 text-center text-xs text-stone-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                const isAllOption = opt.value === '' || opt.value === null

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100/70 hover:text-stone-900'
                    } ${isAllOption ? 'text-stone-500 italic' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.dot && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                      )}
                      {opt.devName && (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${getAvatarColorClass(
                            opt.devName
                          )}`}
                        >
                          {getAvatarInitials(opt.devName)}
                        </span>
                      )}
                      {opt.badgeClass ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${opt.badgeClass}`}
                        >
                          {opt.label}
                        </span>
                      ) : (
                        <span className="truncate">{opt.label}</span>
                      )}
                      {opt.subtitle && (
                        <span className="text-[10px] text-stone-400 truncate">
                          {opt.subtitle}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
