'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Home, Building2, Loader2, ArrowRight } from 'lucide-react'
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
]

export default function OnboardingSetupPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [selected, setSelected] = useState<'residential' | 'commercial' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  async function handleSave() {
    if (!selected || !orgId) {
      setError('Missing information. Please try again.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Only update property_type — do NOT overwrite name or other fields
      // that were already set by the webhook when the org was created.
      const { error: updateError } = await (supabase as any)
        .from('organizations')
        .update({ property_type: selected })
        .eq('id', orgId)

      if (updateError) throw updateError

      setCompleted(true)

      // Small delay so user sees the success state before redirect
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1200)

    } catch (err: unknown) {
      console.error('[onboarding/setup] save error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const selectedType = PROPERTY_TYPES.find(p => p.type === selected)

  return (
    <OnboardingLayout>
      <div className="space-y-6">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Complete your setup
          </h1>
          <p className="text-slate-500 mt-1">
            Choose your property type to unlock the right features
          </p>
        </div>

        {!completed ? (
          <>
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

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              onClick={handleSave}
              disabled={!selected || saving}
              className="w-full h-11 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-semibold"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              ) : (
                <>Continue to Dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </>
        ) : (
          selectedType && (
            <div className="text-center space-y-4 py-8">
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${selectedType.bg}`}>
                <selectedType.icon className={`h-8 w-8 ${selectedType.color}`} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">You&apos;re all set! 🎉</h2>
              <p className="text-slate-500 text-sm">Taking you to your dashboard...</p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
            </div>
          )
        )}
      </div>
    </OnboardingLayout>
  )
}
