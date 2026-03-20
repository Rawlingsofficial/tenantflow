"use client";

import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { useSyncClerkToSupabase } from '@/hooks/useSyncClerkToSupabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useSyncClerkToSupabase()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
