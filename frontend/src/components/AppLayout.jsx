import React from 'react'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gh-bg text-gh-text">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-dotted-grid relative">
        <div className="max-w-6xl mx-auto px-6 py-8 md:px-10 md:py-10 relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
