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
      const { error } = await supabase
        .from('organizations')
        .upsert({
          id: orgId,
          name: 'Temp Org', // temporary fallback
          property_type: selected,
        } as any)

      if (error) throw error

      setCompleted(true)

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1200)

    } catch (err: unknown) {
      console.error(err)
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
            Choose your property type
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
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </>
        ) : (
          selectedType && (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold">Ready 🎉</h2>
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          )
        )}
      </div>
    </OnboardingLayout>
  )
}

