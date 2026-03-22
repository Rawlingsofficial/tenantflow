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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) { router.replace('/sign-in'); return }
    if (!orgId) { router.replace('/onboarding'); return }

    // org exists — now check property_type is set
    const supabase = getSupabaseBrowserClient()
    supabase
      .from('organizations')
      .select('property_type')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        const pt = (data as any)?.property_type
        if (!pt) {
          // org created but user never picked a type → send to setup
          router.replace('/onboarding/setup')
        } else {
          setReady(true)
        }
      })
  }, [isLoaded, userId, orgId])

  if (!ready) {
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
