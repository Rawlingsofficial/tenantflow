// src/app/(dashboard)/_shell.tsx
'use client'

import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { OrganizationProvider } from '@/components/providers/OrganizationProvider'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#0d1117]">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-[#F4F6F9]">
            {children}
          </main>
        </div>
      </div>
    </OrganizationProvider>
  )
}
