'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Receipt, TrendingUp, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format, subMonths } from 'date-fns'

export default function CommercialReportsPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const [bRes, tRes, lRes, iRes] = await Promise.all([
      (supabase as any).from('buildings').select('id, name').eq('organization_id', orgId!),
      (supabase as any).from('tenants').select('id, status, tenant_type').eq('organization_id', orgId!).eq('tenant_type', 'company'),
      (supabase as any).from('leases').select('id, status, rent_amount, service_charge, lease_end, unit_id').eq('organization_id', orgId!),
      (supabase as any).from('invoices').select('id, status, total_amount, invoice_date, due_date').eq('organization_id', orgId!),
    ])

    // Get units for buildings
    const bIds = (bRes.data ?? []).map((b: any) => b.id)
    let units: any[] = []
    if (bIds.length > 0) {
      const { data: uData } = await (supabase as any).from('units').select('id, status, default_rent, building_id').in('building_id', bIds)
      units = uData ?? []
    }

    setData({
      buildings: bRes.data ?? [],
      tenants: tRes.data ?? [],
      leases: lRes.data ?? [],
      invoices: iRes.data ?? [],
      units,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
  )

  const { buildings, tenants, leases, invoices, units } = data

  const activeLeases = leases.filter((l: any) => l.status === 'active')
  const occupied = units.filter((u: any) => u.status === 'occupied').length
  const vacant = units.filter((u: any) => u.status === 'vacant').length
  const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0
  const monthlyExpected = activeLeases.reduce((s: number, l: any) => s + Number(l.rent_amount) + Number(l.service_charge ?? 0), 0)

  const thisMonth = format(new Date(), 'yyyy-MM')
  const paidThisMonth = invoices
    .filter((i: any) => i.status === 'paid' && i.invoice_date?.startsWith(thisMonth))
    .reduce((s: number, i: any) => s + Number(i.total_amount), 0)
  const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue')
  const collectionRate = monthlyExpected > 0 ? Math.round((paidThisMonth / monthlyExpected) * 100) : 0

  // 9-month invoice trend
  const monthly = Array.from({ length: 9 }, (_, i) => {
    const m = subMonths(new Date(), 8 - i)
    const ms = format(m, 'yyyy-MM')
    const val = invoices
      .filter((inv: any) => inv.status === 'paid' && inv.invoice_date?.startsWith(ms))
      .reduce((s: number, inv: any) => s + Number(inv.total_amount), 0)
    return { label: format(m, 'MMM'), value: val }
  })
  const maxVal = Math.max(...monthly.map(m => m.value), 1)

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-6 pb-5">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Commercial Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Portfolio analytics for your commercial properties</p>
      </div>

      {/* Alert strip */}
      {overdueInvoices.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <span className="font-semibold">{overdueInvoices.length} invoice{overdueInvoices.length > 1 ? 's' : ''} overdue</span>
              {' '}— ${overdueInvoices.reduce((s: number, i: any) => s + Number(i.total_amount), 0).toLocaleString()} outstanding
            </p>
            <button onClick={() => router.push('/invoices?tab=overdue')}
              className="ml-auto text-xs text-red-700 font-medium underline">View →</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Spaces', value: units.length, sub: `${occupancyRate}% occupied`, color: 'text-gray-800' },
          { label: 'Active Companies', value: tenants.filter((t: any) => t.status === 'active').length, sub: `${activeLeases.length} active leases`, color: 'text-blue-600' },
          { label: 'Monthly Expected', value: `$${monthlyExpected.toLocaleString()}`, sub: 'rent + service charges', color: 'text-gray-800' },
          { label: 'Collection Rate', value: `${collectionRate}%`, sub: `$${paidThisMonth.toLocaleString()} collected`, color: collectionRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-5">
        {[
          {
            href: '/commercial/reports/revenue',
            title: 'Revenue & Invoices',
            desc: `$${paidThisMonth.toLocaleString()} collected · ${overdueInvoices.length} overdue`,
            stat: `${collectionRate}%`,
            statLabel: 'collection rate',
            icon: TrendingUp,
            gradient: 'from-blue-500 to-[#1B3B6F]',
          },
          {
            href: '/commercial/reports/occupancy',
            title: 'Space Occupancy',
            desc: `${occupied} occupied · ${vacant} available`,
            stat: `${occupancyRate}%`,
            statLabel: 'occupancy rate',
            icon: Building2,
            gradient: 'from-[#14b8a6] to-blue-600',
          },
        ].map(card => (
          <button key={card.href} onClick={() => router.push(card.href)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow group">
            <div className={`h-32 bg-gradient-to-br ${card.gradient} p-5 flex items-center justify-between`}>
              <div>
                <p className="text-4xl font-bold text-white">{card.stat}</p>
                <p className="text-white/70 text-sm mt-1">{card.statLabel}</p>
              </div>
              <card.icon className="h-12 w-12 text-white/25" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
              <p className="text-xs text-blue-600 font-medium mt-3">View Report →</p>
            </div>
          </button>
        ))}
      </div>

      {/* Invoice trend chart */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Invoice Collections</p>
              <p className="text-xs text-gray-400">Last 9 months</p>
            </div>
            <p className="text-lg font-bold text-emerald-600">
              ${invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total_amount), 0).toLocaleString()}
              <span className="text-xs text-gray-400 font-normal ml-1">all time</span>
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col justify-between text-[10px] text-gray-400 h-24 pb-5 text-right pr-1">
              <span>${maxVal.toLocaleString()}</span>
              <span>${Math.round(maxVal / 2).toLocaleString()}</span>
              <span>$0</span>
            </div>
            <div className="flex-1">
              <div className="flex items-end gap-1.5 h-20">
                {monthly.map((m, i) => {
                  const h = (m.value / maxVal) * 100
                  const isCurrent = i === monthly.length - 1
                  return (
                    <div key={i} className="flex-1 rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(h, 6)}%`,
                        background: isCurrent
                          ? 'linear-gradient(to top, #1B3B6F, #14b8a6)'
                          : 'linear-gradient(to top, #bfdbfe, #dbeafe)',
                        minHeight: '4px',
                        opacity: m.value === 0 ? 0.3 : 1,
                      }} />
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                {monthly.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <p className="text-[10px] text-gray-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Building breakdown */}
      {buildings.length > 0 && (
        <div className="px-6 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">Buildings Overview</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Building', 'Spaces', 'Occupied', 'Occupancy', 'Monthly Revenue'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildings.map((b: any) => {
                  const bUnits = units.filter((u: any) => u.building_id === b.id)
                  const bOcc = bUnits.filter((u: any) => u.status === 'occupied').length
                  const rate = bUnits.length > 0 ? Math.round((bOcc / bUnits.length) * 100) : 0
                  const bLeaseIds = new Set(activeLeases.filter((l: any) => bUnits.some((u: any) => u.id === l.unit_id)).map((l: any) => l.id))
                  const bRev = activeLeases
                    .filter((l: any) => bLeaseIds.has(l.id))
                    .reduce((s: number, l: any) => s + Number(l.rent_amount) + Number(l.service_charge ?? 0), 0)
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{bUnits.length}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{bOcc}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-8">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-emerald-600">${bRev.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
