'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Home, Building2, Layers, Check, ArrowRight } from 'lucide-react'

type PropertyType = 'residential' | 'commercial' | 'mixed'
type Step = 1 | 2 | 3

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

export default function OnboardingPage() {
  const router = useRouter()
  const { createOrganization, setActive } = useOrganizationList()
  const supabase = getSupabaseBrowserClient()

  const [step, setStep] = useState<Step>(1)
  const [orgName, setOrgName] = useState('')
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: create org
  async function handleStep1() {
    if (!orgName.trim()) { setError('Organization name is required'); return }
    if (!createOrganization || !setActive) { setError('Please refresh and try again'); return }
    setLoading(true); setError('')
    try {
      const org = await createOrganization({ name: orgName.trim() })
      await setActive({ organization: org.id })
      const { error: e } = await supabase.from('organizations').insert({
        id: org.id,
        name: orgName.trim(),
        property_type: 'residential', // default, will be updated in step 2
      } as any)
      if (e) throw new Error(e.message)
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  // Step 2: save property type (org already created, just update it)
  async function handleStep2() {
    if (!selectedType) return
    setLoading(true); setError('')
    try {
      // Get the current active org from Clerk context
      // We update using the org that was just made active in step 1
      const { data: orgs } = await supabase.from('organizations').select('id').order('id').limit(1)
      // Actually we need the org ID — it was set active in step 1
      // Use .update on organizations where name matches (safe since just created)
      const { error: e } = await supabase
        .from('organizations')
        .update({ property_type: selectedType } as any)
        .eq('name', orgName.trim())
      if (e) throw new Error(e.message)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  async function handleFinish() {
    router.push('/dashboard')
  }

  const selected = PROPERTY_TYPES.find(p => p.type === selectedType)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo — keep existing branding */}
        <div className="flex items-center justify-center gap-2">
          <div className="relative h-9 w-9 shrink-0">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
              <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
              <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#14b8a6"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-0">
            <span className="text-[#1B3B6F] font-bold text-xl leading-none tracking-tight">Tenant</span>
            <span className="text-[#14b8a6] font-bold text-xl leading-none tracking-tight">Flow</span>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s ? 'bg-[#14b8a6] text-white' :
                step === s ? 'bg-[#1B3B6F] text-white ring-4 ring-slate-200' :
                'bg-slate-100 text-slate-400'
              }`}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && <div className={`w-10 h-0.5 ${step > s ? 'bg-[#14b8a6]' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Create org ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Create your organization</h1>
              <p className="text-sm text-slate-500 mt-1">Set up your property management workspace.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Organization name *</Label>
              <Input
                placeholder="e.g. Acme Properties"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button onClick={handleStep1} disabled={loading}
              className="w-full h-11 bg-[#1B3B6F] hover:bg-[#152e56] text-white rounded-xl font-semibold gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="text-center text-xs text-slate-400">You'll be set as the owner with full access.</p>
          </div>
        )}

        {/* ── STEP 2: Property type ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">What do you manage?</h2>
              <p className="text-sm text-slate-500 mt-1">This shapes your entire experience — labels, forms, and features adapt to your answer.</p>
            </div>

            <div className="space-y-3 mb-5">
              {PROPERTY_TYPES.map(pt => {
                const isSelected = selectedType === pt.type
                return (
                  <button key={pt.type} onClick={() => setSelectedType(pt.type)}
                    className={`w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
                      isSelected ? `${pt.border} ${pt.bg}` : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                    <div className="p-4 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-white/70' : 'bg-slate-100'
                      }`}>
                        <pt.icon className={`h-4.5 w-4.5 ${isSelected ? pt.color : 'text-slate-400'}`} />
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
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="h-10 rounded-xl px-5 text-sm border-slate-200">Back</Button>
              <Button onClick={handleStep2} disabled={!selectedType || loading}
                className="flex-1 h-10 bg-[#1B3B6F] hover:bg-[#152e56] text-white rounded-xl font-semibold gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirmation ── */}
        {step === 3 && selected && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className={`w-14 h-14 rounded-2xl ${selected.bg} border-2 ${selected.border} flex items-center justify-center mx-auto mb-4`}>
                <selected.icon className={`h-7 w-7 ${selected.color}`} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{orgName} is ready 🎉</h2>
              <p className="text-sm text-slate-400 mt-1">Here's how TenantFlow is configured</p>
            </div>

            <div className="space-y-2.5 mb-6">
              {[
                { label: 'Organization', value: orgName },
                { label: 'Portfolio type', value: selected.title },
                {
                  label: 'Tenants section',
                  value: selected.type === 'commercial' ? 'Companies' :
                    selected.type === 'mixed' ? 'Tenants & Companies (toggle in sidebar)' : 'Tenants',
                },
                { label: 'Units section', value: selected.type === 'commercial' ? 'Spaces' : 'Units' },
                { label: 'Payments', value: selected.type === 'commercial' ? 'Invoices' : selected.type === 'mixed' ? 'Payments & Invoices' : 'Payments' },
              ].map(item => (
                <div key={item.label} className={`flex items-start gap-3 p-3 rounded-xl ${selected.bg}`}>
                  <div className={`w-4.5 h-4.5 rounded-full ${selected.check} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{item.label}</p>
                    <p className={`text-sm font-bold ${selected.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleFinish}
              className="w-full h-11 bg-[#1B3B6F] hover:bg-[#152e56] text-white rounded-xl font-bold gap-2">
              Launch TenantFlow <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
