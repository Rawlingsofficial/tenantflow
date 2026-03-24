'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Home, Building2, Layers, Check } from 'lucide-react'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
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

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const { createOrganization, setActive } = useOrganizationList()
  const supabase = getSupabaseBrowserClient()

  const [step, setStep] = useState<Step>(1)
  const [orgName, setOrgName] = useState('')
  const [selectedType, setSelectedType] = useState<typeof PROPERTY_TYPES[number]['type'] | null>(null)
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStep1 = async () => {
    if (!orgName.trim()) { setError('Organization name is required'); return }
    if (!createOrganization || !setActive) { setError('Please refresh and try again'); return }
    setLoading(true); setError('')
    try {
      const org = await createOrganization({ name: orgName.trim() })
      await setActive({ organization: org.id })
      const { error: e } = await supabase.from('organizations').insert(dbVal({
        id: org.id,
        name: orgName.trim(),
      }))
      if (e) throw new Error(e.message)
      setCreatedOrgId(org.id)
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const handleStep2 = async () => {
    if (!selectedType || !createdOrgId) return
    setLoading(true); setError('')
    try {
      const { error: e } = await supabase
        .from('organizations')
        .update(dbVal({ property_type: selectedType }))
        .eq('id', createdOrgId)
      if (e) throw new Error(e.message)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const handleFinish = () => {
    window.location.href = '/dashboard'
  }

  const selected = PROPERTY_TYPES.find(p => p.type === selectedType)

  return (
    <OnboardingLayout>
      <div className="space-y-6">
        {/* Logo and title */}
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
          <h1 className="text-2xl font-bold text-slate-900">Get started with TenantFlow</h1>
          <p className="text-slate-500 mt-1">Set up your organization and portfolio in minutes</p>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={[1, 2, 3]} currentStep={step} />

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Organization name</Label>
              <Input
                placeholder="e.g., Acme Properties"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStep1()}
                className="h-11 rounded-xl border-slate-200 focus:ring-[#2BBE9A]/20"
                autoFocus
              />
              <p className="text-xs text-slate-400">This will be your workspace name.</p>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button
              onClick={handleStep1}
              disabled={loading}
              className="w-full h-11 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-semibold gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">What type of properties do you manage?</h2>
              <p className="text-sm text-slate-500 mt-1">This shapes your entire experience — labels, forms, and features adapt to your answer.</p>
            </div>
            <div className="space-y-3">
              {PROPERTY_TYPES.map(pt => (
                <PropertyTypeCard
                  key={pt.type}
                  {...pt}
                  selected={selectedType === pt.type}
                  onSelect={() => setSelectedType(pt.type)}
                />
              ))}
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="h-10 rounded-xl px-5 text-sm border-slate-200">
                Back
              </Button>
              <Button
                onClick={handleStep2}
                disabled={!selectedType || loading}
                className="flex-1 h-10 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-semibold gap-2"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selected && (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-2xl ${selected.bg} border-2 ${selected.border} flex items-center justify-center mx-auto mb-4`}>
                <selected.icon className={`h-8 w-8 ${selected.color}`} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{orgName} is ready 🎉</h2>
              <p className="text-slate-500 mt-1">Your portfolio is configured for {selected.title.toLowerCase()} management.</p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Organization', value: orgName },
                { label: 'Portfolio type', value: selected.title },
                {
                  label: 'Tenants section',
                  value: selected.type === 'commercial' ? 'Companies' :
                    selected.type === 'mixed' ? 'Tenants & Companies (toggle in sidebar)' : 'Tenants',
                },
                {
                  label: 'Units section',
                  value: selected.type === 'commercial' ? 'Spaces' : 'Units',
                },
                {
                  label: 'Payments',
                  value: selected.type === 'commercial' ? 'Invoices' :
                    selected.type === 'mixed' ? 'Payments & Invoices' : 'Payments',
                },
              ].map(item => (
                <div key={item.label} className={`flex items-start gap-3 p-3 rounded-xl ${selected.bg}`}>
                  <div className={`w-5 h-5 rounded-full ${selected.check} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{item.label}</p>
                    <p className={`text-sm font-bold ${selected.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleFinish}
              className="w-full h-11 bg-[#1F3A5F] hover:bg-[#152e56] text-white rounded-xl font-bold gap-2"
            >
              Launch TenantFlow <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}

