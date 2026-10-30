import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectBreadcrumb({ projectName, version, versions = [], onVersionChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className='flex items-center gap-2.5 min-w-0'>
      <span className='font-semibold text-sm tracking-tight text-stone-900 truncate' title={projectName}>
        {projectName}
      </span>

      <span className='text-stone-300 font-light select-none text-xs' aria-hidden='true'>/</span>

      <div className='relative' ref={menuRef}>
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-stone-700 bg-stone-100/90 hover:bg-stone-200/80 border border-stone-200/90 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-stone-400 select-none'
          title='Switch version'
        >
          <GitBranch className='size-3 text-stone-500 opacity-75 shrink-0' />
          <span className='tracking-tight'>{version || 'v1.0.0'}</span>
          <ChevronDown className='size-3 text-stone-400 ml-0.5 shrink-0' />
        </button>

        {isOpen && (
          <div className='absolute left-0 mt-1 w-48 p-1.5 bg-white border border-stone-200/90 shadow-lg rounded-lg z-50 animate-in fade-in zoom-in-95 duration-100'>
            <div className='text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-1'>
              Project Versions
            </div>
            <div className='h-px bg-stone-100 my-1' />
            <div className='max-h-60 overflow-y-auto space-y-0.5'>
              {versions.map(v => {
                const vLabel = v.label || `v${v.versionNumber}`
                const isSelected = vLabel === version || String(v.versionNumber) === version || `v${v.versionNumber}` === version
                return (
                  <button
                    key={v.versionId || v.id}
                    type='button'
                    onClick={() => {
                      onVersionChange?.(v)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md cursor-pointer font-mono transition-colors text-left',
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                    )}
                  >
                    <span className='truncate'>{vLabel}</span>
                    {isSelected && <Check className='h-3.5 w-3.5 text-emerald-600 shrink-0 ml-2' />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
