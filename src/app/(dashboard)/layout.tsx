// src/app/(dashboard)/layout.tsx
'use client'

/**
 * Dashboard layout — dark sidebar + light content area.
 *
 * The sidebar sits on a dark (#0d1117) background.
 * The main content area uses a slightly lighter off-white (#F4F6F9)
 * that matches the residential reports background.
 * Commercial/mixed pages override the bg themselves (they go full dark).
 */

import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0d1117]">
      {/* Dark sidebar */}
      <Sidebar />

      {/* Main area: topnav + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Dark topnav matching sidebar */}
        <TopNav />

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#F4F6F9]">
          {children}
        </main>
      </div>
    </div>
  )
}
