'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  CheckCircle2, Zap, Building2,
  Users, Home, Crown, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Organization } from '@/types'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'XAF',
    period: 'forever',
    description: 'For individual landlords getting started',
    color: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    features: [
      'Up to 50 units',
      'Up to 5 team members',
      'Tenant management',
      'Lease tracking',
      'Basic payments',
      'Email support',
    ],
    limits: { units: 50, users: 5 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15000,
    currency: 'XAF',
    period: 'month',
    description: 'For growing property portfolios',
    color: 'border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-600',
    popular: true,
    features: [
      'Up to 200 units',
      'Up to 20 team members',
      'Everything in Free',
      'Advanced reports',
      'Payment export (CSV)',
      'Document storage',
      'Priority support',
    ],
    limits: { units: 200, users: 20 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    currency: 'XAF',
    period: 'custom',
    description: 'For large portfolios and property companies',
    color: 'border-emerald-400',
    badge: 'bg-emerald-100 text-emerald-600',
    features: [
      'Unlimited units',
      'Unlimited team members',
      'Everything in Pro',
      'Custom permissions',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    limits: { units: Infinity, users: Infinity },
  },
]

export default function BillingSettings() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const [org, setOrg] = useState<Organization | null>(null)
  const [usage, setUsage] = useState({ units: 0, users: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId) {
      loadOrgAndUsage()
    }
  }, [orgId])

  async function loadOrgAndUsage() {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId!)
      .single() as { data: Organization | null; error: any }

    setOrg(orgData)

    // Count usage
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id')
      .eq('organization_id', orgId!)
      .eq('status', 'active')

    const buildingIds = (buildings ?? []).map((b) => b.id)
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('building_id', buildingIds.length > 0 ? buildingIds : ['none'])

    const { data: members } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', orgId!)
      .eq('status', 'active')

    setUsage({
      units: units?.length ?? 0,
      users: members?.length ?? 0,
    })
    setLoading(false)
  }

  const currentPlan = PLANS.find((p) => p.id === (org?.plan_type ?? 'free')) ?? PLANS[0]
  const unitPct = org?.unit_limit ? Math.round((usage.units / org.unit_limit) * 100) : 0
  const userPct = org?.user_limit ? Math.round((usage.users / org.user_limit) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Current plan + usage */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Current plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {currentPlan.name}
                </span>
                <Badge className={`text-xs ${currentPlan.badge} hover:${currentPlan.badge}`}>
                  Active
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {currentPlan.description}
              </p>
            </div>
            <div className="text-right">
              {currentPlan.price === 0 && currentPlan.id === 'free' ? (
                <p className="text-2xl font-bold text-slate-900">Free</p>
              ) : currentPlan.price === 0 ? (
                <p className="text-lg font-bold text-slate-900">Custom pricing</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {currentPlan.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {currentPlan.currency} / {currentPlan.period}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Usage meters */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Usage
            </p>

            {[
              {
                label: 'Units',
                used: usage.units,
                limit: org?.unit_limit ?? 50,
                pct: unitPct,
                icon: Home,
              },
              {
                label: 'Team members',
                used: usage.users,
                limit: org?.user_limit ?? 5,
                pct: userPct,
                icon: Users,
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    item.pct >= 100 ? 'text-red-600'
                    : item.pct >= 80 ? 'text-amber-600'
                    : 'text-slate-700'
                  }`}>
                    {item.used} / {item.limit === Infinity ? '∞' : item.limit}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.pct >= 100 ? 'bg-red-500'
                      : item.pct >= 80 ? 'bg-amber-500'
                      : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
                {item.pct >= 80 && (
                  <p className="text-xs text-amber-600">
                    {item.pct >= 100
                      ? `Limit reached — upgrade to add more ${item.label.toLowerCase()}`
                      : `${item.limit - item.used} remaining`
                    }
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Available plans
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === (org?.plan_type ?? 'free')
            return (
              <Card
                key={plan.id}
                className={`shadow-none relative ${
                  isCurrent
                    ? 'border-indigo-400 border-2'
                    : plan.popular
                      ? 'border-indigo-200'
                      : 'border-slate-200'
                }`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                      Most popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Current plan
                    </span>
                  </div>
                )}

                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{plan.description}</p>
                    <div className="mt-2">
                      {plan.price === 0 && plan.id === 'free' ? (
                        <span className="text-2xl font-bold text-slate-900">Free</span>
                      ) : plan.price === 0 ? (
                        <span className="text-lg font-bold text-slate-900">Contact us</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-slate-900">
                            {plan.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            {plan.currency}/{plan.period}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {!isCurrent && (
                    <Button
                      className={`w-full gap-2 ${
                        plan.id === 'enterprise'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      onClick={() => {
                        if (plan.id === 'enterprise') {
                          window.open('mailto:support@tenantflow.app?subject=Enterprise Plan', '_blank')
                        } else {
                          alert('Payment integration coming soon. Contact support to upgrade.')
                        }
                      }}
                    >
                      {plan.id === 'enterprise' ? 'Contact us' : `Upgrade to ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {isCurrent && (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium py-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Active plan
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Note */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Need help choosing?</span>{' '}
          Contact us at{' '}
          <a href="mailto:support@tenantflow.app" className="text-indigo-600 hover:underline">
            support@tenantflow.app
          </a>
          {' '}and we'll help you find the right plan for your portfolio size.
        </p>
      </div>
    </div>
  )
}

