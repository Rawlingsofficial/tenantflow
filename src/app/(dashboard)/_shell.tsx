// src/app/(dashboard)/_shell.tsx
'use client'

import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { OrganizationProvider } from '@/components/providers/OrganizationProvider'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <div className="flex h-screen w-full overflow-hidden bg-white">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-slate-50">
            {children}
          </main>
        </div>
      </div>
    </OrganizationProvider>
  )
}
