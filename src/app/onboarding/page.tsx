// src/app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight } from 'lucide-react'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()
  const { createOrganization, setActive } = useOrganizationList()

  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!orgName.trim()) { setError('Organization name is required'); return }
    if (!createOrganization || !setActive) { setError('Please refresh and try again'); return }
    if (!user) { setError('User not found'); return }

    setLoading(true)
    setError('')

    try {
      // 1. Create org in Clerk — webhook fires automatically and syncs to Supabase
      const org = await createOrganization({ name: orgName.trim() })

      // 2. Set as active org in Clerk session
      await setActive({ organization: org.id })

      // 3. Go to property type setup
      // DO NOT insert into Supabase here — the webhook handles org + membership sync
      router.push('/onboarding/setup')

    } catch (err: unknown) {
      console.error('[onboarding] create org error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <OnboardingLayout>
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 15L16 4L29 15" stroke="#2BBE9A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 13V27H26V13" stroke="#1F3A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1F3A5F"/>
                <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1F3A5F"/>
                <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#2BBE9A"/>
                <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#2BBE9A"/>
              </svg>
            </div>
            <div>
              <span className="text-[#1F3A5F] font-bold text-2xl">Tenant</span>
              <span className="text-[#2BBE9A] font-bold text-2xl">Flow</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your organization</h1>
          <p className="text-slate-500 mt-1">Set up your property management workspace</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Organization name</Label>
            <Input
              placeholder="e.g., Acme Properties"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="h-11 rounded-xl border-slate-200 focus:ring-[#2BBE9A]/20"
              autoFocus
            />
            <p className="text-xs text-slate-400">This will be your workspace name.</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={loading || !orgName.trim()}
            className="w-full h-11 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-semibold gap-2"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              : <>Continue <ArrowRight className="h-4 w-4" /></>
            }
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
