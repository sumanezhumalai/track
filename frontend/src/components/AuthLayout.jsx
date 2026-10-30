import React from 'react'
import { AlertCircle, GripVertical } from 'lucide-react'
import topographyPattern from '../assets/topography.svg'

export default function AuthLayout({
  badge = 'Active',
  telemetryTitle = 'Live telemetry',
  telemetryItems = ['Active sessions', 'Live stopwatches', 'Escalation routing'],
  heading,
  description,
  error,
  children,
  footer,
}) {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white text-stone-900">
      {/* Left Artwork Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0E3A24] relative overflow-hidden items-center justify-center p-12 select-none">
        <div
          className="absolute inset-0 bg-repeat opacity-[0.14] pointer-events-none invert mix-blend-screen"
          style={{
            backgroundImage: `url(${topographyPattern})`,
            backgroundSize: '450px 450px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-800/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-[360px] h-[480px] max-w-full flex items-center justify-center">
          <svg
            viewBox="0 0 400 540"
            className="absolute -left-6 -top-4 w-full h-full text-[#082215] opacity-90 drop-shadow-2xl pointer-events-none"
          >
            <path
              d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative w-[340px] h-[460px] drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)]">
            <svg className="w-full h-full" viewBox="0 0 400 540">
              <defs>
                <clipPath id="leafClipAuth" clipPathUnits="userSpaceOnUse">
                  <path d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z" />
                </clipPath>
              </defs>
              <path
                d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z"
                fill="none"
                stroke="#1B633C"
                strokeWidth="2.5"
                className="opacity-40"
              />
            </svg>
          </div>

          <div className="absolute -top-6 -right-3 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 overflow-hidden select-none z-20">
            <div className="px-3.5 py-2.5 bg-stone-50/90 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold tracking-tight text-stone-800">
                  {telemetryTitle}
                </span>
              </div>
              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                {badge}
              </span>
            </div>

            <div className="p-2 space-y-0.5">
              {telemetryItems.map((item, idx) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-stone-700 ${
                    idx > 0 ? 'border-t border-stone-100/80' : ''
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-stone-300 shrink-0" />
                  <span className="text-xs font-medium text-stone-800 tracking-tight">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex items-center justify-center p-8 sm:p-14 lg:p-20 bg-white relative">
        <div className="w-full max-w-md relative z-10">
          <div className="mb-8">
            <span className="font-sans font-bold text-2xl tracking-tight text-stone-900 lowercase">
              egs support
            </span>
          </div>

          <h1 className="font-untitled text-4xl sm:text-5xl text-stone-900 font-normal tracking-tight leading-[1.14] mb-3">
            {heading}
          </h1>

          <p className="text-stone-600 text-sm leading-relaxed mb-8 max-w-sm">
            {description}
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {children}

          {footer}
        </div>
      </div>
    </div>
  )
}
