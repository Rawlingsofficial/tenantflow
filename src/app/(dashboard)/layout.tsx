'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { useSyncClerkToSupabase } from '@/hooks/useSyncClerkToSupabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useSyncClerkToSupabase()
  const { userId, orgId, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) { router.replace('/sign-in'); return }
    if (!orgId) { router.replace('/onboarding'); return }
  }, [isLoaded, userId, orgId, router])

  // Block render until Clerk is loaded and org is confirmed
  if (!isLoaded || !userId || !orgId) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <p className="text-xs text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

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
