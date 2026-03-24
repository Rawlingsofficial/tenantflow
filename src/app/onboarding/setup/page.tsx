'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Home, Building2, Layers, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { PropertyTypeCard } from '@/components/onboarding/PropertyTypeCard'

const PROPERTY_TYPES = [
  {
    type: 'residential' as const,
    icon: Home,
    title: 'Residential',
    subtitle: 'Apartments, Houses & Flats',
    description: 'You rent to individuals and families.',
    examples: ['Apartments', 'Houses & villas', 'Studios', 'Guesthouses'],
    tenantLabel: 'Individuals & families',
    unitLabel: 'Apartments, studios, rooms',
    paymentLabel: 'Record rent received',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    check: 'bg-emerald-600',
  },
  {
    type: 'commercial' as const,
    icon: Building2,
    title: 'Commercial',
    subtitle: 'Offices, Retail & Warehouses',
    description: 'You rent to businesses and companies.',
    examples: ['Office buildings', 'Retail spaces', 'Warehouses', 'Co-working'],
    tenantLabel: 'Companies & businesses',
    unitLabel: 'Offices, shops, warehouses',
    paymentLabel: 'Generate & track invoices',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    check: 'bg-blue-600',
  },
  {
    type: 'mixed' as const,
    icon: Layers,
    title: 'Mixed Portfolio',
    subtitle: 'Residential & Commercial',
    description: 'Your portfolio includes both. Switch views anytime from the sidebar.',
    examples: ['Mixed-use buildings', 'Residential + retail', 'Diverse portfolio'],
    tenantLabel: 'Individuals and companies',
    unitLabel: 'Apartments and commercial spaces',
    paymentLabel: 'Payments + Invoices (both)',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-500',
    check: 'bg-violet-600',
  },
]

function dbVal<T>(v: T): never { return v as never }

export default function OnboardingSetupPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [selected, setSelected] = useState<typeof PROPERTY_TYPES[number]['type'] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!selected || !orgId) return
    setSaving(true); setError('')
    try {
      const { error: e } = await supabase
        .from('organizations')
        .update(dbVal({ property_type: selected }))
        .eq('id', orgId)
      if (e) throw new Error(e.message)
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const selectedType = PROPERTY_TYPES.find(p => p.type === selected)

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
              </svg>
            </div>
            <div>
              <span className="text-[#1F3A5F] font-bold text-2xl">Tenant</span>
              <span className="text-[#2BBE9A] font-bold text-2xl">Flow</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">One last step</h1>
          <p className="text-slate-500 mt-1">Tell us what type of properties you manage.</p>
        </div>

        <div className="space-y-3">
          {PROPERTY_TYPES.map(pt => (
            <PropertyTypeCard
              key={pt.type}
              {...pt}
              selected={selected === pt.type}
              onSelect={() => setSelected(pt.type)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full h-11 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-bold gap-2"
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            : <>Continue to Dashboard <ArrowRight className="h-4 w-4" /></>}
        </Button>

        <p className="text-center text-xs text-slate-400">
          This can only be changed by contacting support.
        </p>
      </div>
    </OnboardingLayout>
  )
}

