'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  Zap, Check, X, Building2, Users,
  FileText, CreditCard, BarChart3,
  Shield, Headphones, Star, ArrowRight,
  Lock, Globe, Phone, Mail
} from 'lucide-react'
import type { Organization } from '@/types'

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    priceUSD: 0,
    priceXAF: 0,
    period: 'forever',
    tagline: 'For the small landlord just getting started',
    color: 'border-slate-200',
    headerBg: 'bg-slate-50',
    headerText: 'text-slate-900',
    subText: 'text-slate-500',
    badge: null,
    badgeBg: '',
    cta: 'Current plan',
    ctaStyle: 'bg-slate-100 text-slate-400 cursor-default border border-slate-200',
    highlight: false,
    features: [
      { text: 'Up to 7 units', included: true },
      { text: '1 user only', included: true },
      { text: 'Buildings & unit management', included: true },
      { text: 'Tenant profiles', included: true },
      { text: 'Lease management', included: true },
      { text: 'Manual payment tracking', included: true },
      { text: 'Document uploads', included: false },
      { text: 'Reports & analytics', included: false },
      { text: 'Team members', included: false },
      { text: 'Automated reminders', included: false },
      { text: 'Priority support', included: false },
      { text: 'Custom branding', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUSD: 9,
    priceXAF: 5500,
    period: 'month',
    tagline: 'For the growing landlord ready to get serious',
    color: 'border-indigo-500',
    headerBg: 'bg-indigo-600',
    headerText: 'text-white',
    subText: 'text-indigo-200',
    badge: 'Most Popular',
    badgeBg: 'bg-white text-indigo-600',
    cta: 'Upgrade to Pro',
    ctaStyle: 'bg-white text-indigo-600 hover:bg-indigo-50 font-bold',
    highlight: true,
    features: [
      { text: 'Up to 30 units', included: true },
      { text: 'Up to 3 team members', included: true },
      { text: 'Buildings & unit management', included: true },
      { text: 'Tenant profiles', included: true },
      { text: 'Lease management', included: true },
      { text: 'Payment tracking & history', included: true },
      { text: 'Document uploads', included: true },
      { text: 'Reports & analytics', included: true },
      { text: 'Payment CSV export', included: true },
      { text: 'Automated reminders', included: false },
      { text: 'Priority support', included: false },
      { text: 'Custom branding', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceUSD: 29,
    priceXAF: 17500,
    period: 'month',
    tagline: 'For property managers with a serious portfolio',
    color: 'border-emerald-400',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    subText: 'text-emerald-200',
    badge: 'Best Value',
    badgeBg: 'bg-white text-emerald-600',
    cta: 'Upgrade to Premium',
    ctaStyle: 'bg-white text-emerald-600 hover:bg-emerald-50 font-bold',
    highlight: false,
    features: [
      { text: 'Up to 100 units', included: true },
      { text: 'Up to 10 team members', included: true },
      { text: 'Buildings & unit management', included: true },
      { text: 'Tenant profiles', included: true },
      { text: 'Lease management', included: true },
      { text: 'Payment tracking & history', included: true },
      { text: 'Document uploads', included: true },
      { text: 'Advanced reports & analytics', included: true },
      { text: 'Payment CSV export', included: true },
      { text: 'Automated rent reminders', included: true },
      { text: 'Priority support', included: true },
      { text: 'Custom branding', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: null,
    priceXAF: null,
    period: null,
    tagline: 'For large portfolios, agencies & institutions',
    color: 'border-slate-900',
    headerBg: 'bg-slate-900',
    headerText: 'text-white',
    subText: 'text-slate-400',
    badge: 'Custom',
    badgeBg: 'bg-indigo-500 text-white',
    cta: 'Contact us',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold',
    highlight: false,
    features: [
      { text: 'Unlimited units', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Buildings & unit management', included: true },
      { text: 'Tenant profiles', included: true },
      { text: 'Lease management', included: true },
      { text: 'Payment tracking & history', included: true },
      { text: 'Document uploads', included: true },
      { text: 'Advanced reports & analytics', included: true },
      { text: 'Payment CSV export', included: true },
      { text: 'Automated rent reminders', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom branding & white label', included: true },
      { text: 'Full API access', included: true },
    ],
  },
]

const VALUE_PROPS = [
  {
    icon: Shield,
    title: 'Bank-grade security',
    desc: 'All data encrypted at rest and in transit. Your tenant data stays yours — always.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: Headphones,
    title: 'Real human support',
    desc: 'Not bots. Real people who understand property management in your market.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Globe,
    title: 'Built to scale',
    desc: 'Multi-currency support. Manage properties in any country, any currency.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Zap,
    title: 'Manage 100 units as fast as 1',
    desc: 'No lag, no loading screens. Built for speed regardless of portfolio size.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
]

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Downgrade or cancel from your billing settings whenever you want. Your data is always safe.',
  },
  {
    q: 'Do you support mobile money?',
    a: 'MTN MoMo and Orange Money integration is coming soon. You can already track mobile money payments manually today.',
  },
  {
    q: 'What happens when I hit my unit limit?',
    a: "You'll be notified before you hit the limit. Existing data stays accessible — you just won't be able to add new units until you upgrade.",
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. Upgrade instantly or downgrade at the end of your billing cycle. No penalties.',
  },
  {
    q: 'Is my tenant data secure?',
    a: 'All data is encrypted at rest and in transit. We use enterprise-grade infrastructure and never sell or share your data.',
  },
  {
    q: 'Do you offer discounts for annual billing?',
    a: 'Yes — pay annually and get 2 months free. Annual billing coming soon.',
  },
]

export default function BillingPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [org, setOrg] = useState<Organization | null>(null)
  const [stats, setStats] = useState({ units: 0, members: 0 })
  const [showXAF, setShowXAF] = useState(false)

  useEffect(() => {
    if (orgId) loadOrg()
  }, [orgId])

  async function loadOrg() {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId!)
      .single() as { data: Organization | null; error: any }

    if (orgData) setOrg(orgData)

    const { data: buildings } = await supabase
      .from('buildings')
      .select('id')
      .eq('organization_id', orgId!)
      .eq('status', 'active')

    const buildingIds: string[] = (buildings ?? []).map(
      (b: { id: string }) => b.id
    )

    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

    const { data: members } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', orgId!)
      .eq('status', 'active')

    setStats({
      units: (units ?? []).length,
      members: (members ?? []).length,
    })
  }

  const currentPlan = org?.plan_type ?? 'free'

  return (
    <div className="space-y-20 pb-20">

      {/* ── HERO ── */}
      <div className="text-center space-y-5 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600">
          <Zap className="h-3.5 w-3.5" />
          Simple, transparent pricing — no surprises
        </div>

        <h1 className="text-4xl font-black text-slate-900 leading-tight">
          Your portfolio is growing.<br />
          <span className="text-indigo-600">Your tools should too.</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
          From a single landlord with 3 rooms to a property management firm
          with hundreds of units — TenantFlow scales with you.
        </p>

        {/* Current plan status */}
        {org && (
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-slate-900 rounded-2xl text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white">
              You're on the{' '}
              <span className="text-emerald-400 font-bold capitalize">
                {currentPlan}
              </span>{' '}
              plan
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 text-xs">
              {stats.units} unit{stats.units !== 1 ? 's' : ''} ·{' '}
              {stats.members} member{stats.members !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Currency toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={`text-sm font-medium ${!showXAF ? 'text-slate-900' : 'text-slate-400'}`}>
            USD ($)
          </span>
          <button
            onClick={() => setShowXAF(!showXAF)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              showXAF ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                showXAF ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${showXAF ? 'text-slate-900' : 'text-slate-400'}`}>
            XAF (FCFA)
          </span>
        </div>
      </div>

      {/* ── PRICING CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isEnterprise = plan.id === 'enterprise'

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 overflow-hidden flex flex-col ${
                plan.color
              } ${
                plan.highlight
                  ? 'shadow-2xl shadow-indigo-100 scale-[1.02]'
                  : 'shadow-sm hover:shadow-md transition-shadow'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${plan.badgeBg}`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className={`p-5 ${plan.headerBg}`}>
                <h3 className={`text-lg font-bold ${plan.headerText}`}>
                  {plan.name}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${plan.subText}`}>
                  {plan.tagline}
                </p>

                {/* Price */}
                <div className="mt-4">
                  {isEnterprise ? (
                    <div>
                      <p className={`text-3xl font-black ${plan.headerText}`}>
                        Custom
                      </p>
                      <p className={`text-xs mt-1 ${plan.subText}`}>
                        Tailored to your needs
                      </p>
                    </div>
                  ) : plan.priceUSD === 0 ? (
                    <div>
                      <p className={`text-3xl font-black ${plan.headerText}`}>
                        Free
                      </p>
                      <p className={`text-xs mt-1 ${plan.subText}`}>
                        Forever — no card needed
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-end gap-1">
                        <p className={`text-3xl font-black ${plan.headerText}`}>
                          {showXAF
                            ? `${plan.priceXAF?.toLocaleString()} XAF`
                            : `$${plan.priceUSD}`
                          }
                        </p>
                        <p className={`text-xs mb-1.5 ${plan.subText}`}>
                          / {plan.period}
                        </p>
                      </div>
                      {showXAF && (
                        <p className={`text-xs ${plan.subText}`}>
                          ≈ ${plan.priceUSD} USD / month
                        </p>
                      )}
                      {!showXAF && (
                        <p className={`text-xs ${plan.subText}`}>
                          ≈ {plan.priceXAF?.toLocaleString()} XAF / month
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="p-5 bg-white flex-1 space-y-2.5">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                        feature.included ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}
                    >
                      {feature.included
                        ? <Check className="h-2.5 w-2.5 text-emerald-600" />
                        : <X className="h-2.5 w-2.5 text-slate-300" />
                      }
                    </div>
                    <span
                      className={`text-xs ${
                        feature.included ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="p-5 pt-0 bg-white">
                <button
                  disabled={isCurrent}
                  onClick={() => {
                    if (isEnterprise) {
                      window.location.href =
                        'mailto:hello@tenantflow.app?subject=Enterprise Plan Inquiry'
                    } else if (!isCurrent) {
                      alert(
                        `Upgrade to ${plan.name} coming soon! We'll notify you when payments go live.`
                      )
                    }
                  }}
                  className={`w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : plan.ctaStyle
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Current plan
                    </>
                  ) : isEnterprise ? (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      {plan.cta}
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      {plan.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
                {!isCurrent && !isEnterprise && (plan.priceUSD ?? 0) > 0 && (
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Cancel anytime · No contracts
                  </p>
                )}
                {isEnterprise && (
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Custom onboarding · Dedicated SLA
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Annual discount banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold">Pay annually, get 2 months free</p>
            <p className="text-indigo-200 text-sm">
              Annual billing saves you up to $58/year on Premium
            </p>
          </div>
        </div>
        <button
          className="px-5 py-2.5 bg-white text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-50 transition-colors shrink-0"
          onClick={() => alert('Annual billing coming soon!')}
        >
          Coming soon →
        </button>
      </div>

      {/* ── FEATURE GRID ── */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Everything a landlord actually needs
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            No bloat. No features you'll never use. Just the tools that move the needle.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { icon: Building2, label: 'Buildings & Units', desc: 'Full portfolio in one view' },
            { icon: Users, label: 'Tenant Profiles', desc: 'Documents, contacts & history' },
            { icon: FileText, label: 'Lease Management', desc: 'Create, renew and track leases' },
            { icon: CreditCard, label: 'Payment Tracking', desc: "Who paid, who didn't — instantly" },
            { icon: BarChart3, label: 'Reports', desc: 'Revenue, occupancy, collection rate' },
            { icon: Shield, label: 'Secure Storage', desc: 'IDs and documents, safely stored' },
            { icon: Users, label: 'Team Access', desc: 'Roles and permissions per member' },
            { icon: Phone, label: 'Mobile Ready', desc: 'Manage from anywhere, any device' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="p-2 bg-indigo-50 rounded-lg w-fit">
                <item.icon className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── VALUE PROPS ── */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Why landlords choose TenantFlow
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 hover:shadow-md transition-shadow"
            >
              <div className={`p-2.5 rounded-xl w-fit ${prop.bg}`}>
                <prop.icon className={`h-5 w-5 ${prop.color}`} />
              </div>
              <p className="text-sm font-bold text-slate-900">{prop.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{prop.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── EARLY ACCESS ── */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Be among the first
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            We're just getting started — reviews coming as we grow
          </p>
        </div>
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
          <div className="flex justify-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Real reviews from real landlords coming soon. Early adopters help
            shape TenantFlow into exactly what landlords need.
          </p>
          <p className="text-xs font-semibold text-indigo-600">
            Early access users get 3 months of Pro features free.
          </p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Questions? We have answers.
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors"
            >
              <p className="text-sm font-bold text-slate-900">{faq.q}</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="relative bg-slate-900 rounded-3xl p-12 text-center space-y-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-600/20 blur-3xl" />
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-300">
            <Zap className="h-3.5 w-3.5" />
            Start free — upgrade when you're ready
          </div>

          <h2 className="text-3xl font-black text-white leading-tight">
            Stop losing money to<br />
            <span className="text-indigo-400">disorganized property management</span>
          </h2>

          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            Every missed payment, every lost lease, every hour spent on
            spreadsheets is money out of your pocket. TenantFlow pays for
            itself in the first month.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-colors"
              onClick={() => alert('Upgrade flow coming soon!')}
            >
              <Zap className="h-4 w-4" />
              Upgrade to Pro — $9/mo
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                window.location.href = 'mailto:hello@tenantflow.app'
              }}
              className="flex items-center gap-2 px-6 py-3.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Mail className="h-4 w-4" />
              Talk to us about Enterprise
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2">
            {[
              { icon: Lock, text: 'No credit card required' },
              { icon: Check, text: 'Cancel anytime' },
              { icon: Globe, text: 'Simple, transparent pricing' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-1.5 text-slate-500 text-xs"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

