'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import { useSyncClerkToSupabase } from '@/hooks/useSyncClerkToSupabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useSyncClerkToSupabase()
  const { userId, orgId, isLoaded } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    // No user → sign in
    if (!userId) { router.replace('/sign-in'); return }

    // No org at all → create one first
    if (!orgId) { router.replace('/onboarding'); return }

    // Has org — check if property_type is configured in Supabase
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('organizations')
      .select('property_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        const pt = (data as any)?.property_type
        // null means org was created via Clerk UI (bypassed onboarding)
        // or webhook ran but property_type was never set
        if (!pt) {
          router.replace('/onboarding/setup')
          return
        }
        setChecking(false)
      })
  }, [isLoaded, userId, orgId, router])

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center animate-pulse shadow-sm">
            <span className="text-white font-bold">T</span>
          </div>
          <p className="text-xs text-gray-400 font-medium">Loading your workspace...</p>
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
