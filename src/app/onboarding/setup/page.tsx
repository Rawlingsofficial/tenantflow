'use client'

// This page handles users who already have an org (created via Clerk UI
// or whose org was created before onboarding was enforced) but haven't
// picked their property type yet.

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Home, Building2, Layers, Check, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function dbVal<T>(v: T): never { return v as never }

type PropertyType = 'residential' | 'commercial' | 'mixed'

const PROPERTY_TYPES = [
  {
    type: 'residential' as PropertyType,
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
    type: 'commercial' as PropertyType,
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
    type: 'mixed' as PropertyType,
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

export default function OnboardingSetupPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [selected, setSelected] = useState<PropertyType | null>(null)
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
      // Hard redirect so middleware re-reads session with fresh org state
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="relative h-9 w-9 shrink-0">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
              <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
              <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#14b8a6"/>
            </svg>
          </div>
          <div className="flex items-baseline">
            <span className="text-[#1B3B6F] font-bold text-xl leading-none tracking-tight">Tenant</span>
            <span className="text-[#14b8a6] font-bold text-xl leading-none tracking-tight">Flow</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">One last step</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Tell us what type of properties you manage. This shapes your entire experience — labels, forms, and features all adapt to your answer.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {PROPERTY_TYPES.map(pt => {
              const isSelected = selected === pt.type
              return (
                <button key={pt.type} onClick={() => setSelected(pt.type)}
                  className={`w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
                    isSelected ? `${pt.border} ${pt.bg}` : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}>
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-white/70' : 'bg-slate-100'
                    }`}>
                      <pt.icon className={`h-5 w-5 ${isSelected ? pt.color : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <p className={`text-sm font-bold ${isSelected ? pt.color : 'text-slate-900'}`}>{pt.title}</p>
                        <p className="text-xs text-slate-400">{pt.subtitle}</p>
                      </div>
                      <p className="text-xs text-slate-500">{pt.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {pt.examples.map(ex => (
                          <span key={ex} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            isSelected ? `${pt.bg} ${pt.color} border-current/20` : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>{ex}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? `${pt.check} border-transparent` : 'border-slate-200'
                    }`}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Tenants', value: pt.tenantLabel },
                        { label: 'Units', value: pt.unitLabel },
                        { label: 'Payments', value: pt.paymentLabel },
                      ].map(row => (
                        <div key={row.label} className="bg-white/60 rounded-xl p-2 border border-white">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                          <p className={`text-[11px] font-semibold ${pt.color} leading-tight`}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

          <Button onClick={handleSave} disabled={!selected || saving}
            className="w-full h-11 bg-[#1B3B6F] hover:bg-[#152e56] text-white rounded-xl font-bold gap-2">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <>Continue to Dashboard <ArrowRight className="h-4 w-4" /></>}
          </Button>

          <p className="text-center text-xs text-slate-400 mt-3">
            This can only be changed by contacting support.
          </p>
        </div>
      </div>
    </div>
  )
}
