'use client'

import { format, differenceInDays, differenceInMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Inline type — avoids importing from a page file
interface LeaseItem {
  id: string
  status: string
  rent_amount: number | string
  lease_start: string
  lease_end?: string | null
  tenants?: { first_name?: string | null; last_name?: string | null } | null
  units?: { unit_code?: string; buildings?: { name?: string } | null } | null
}

export interface ReportData {
  allLeases: LeaseItem[]
  [key: string]: any
}

interface Props { data: ReportData }

export default function LeaseReport({ data }: Props) {
  const activeLeases = data.allLeases.filter((l) => l.status === 'active')
  const endedLeases = data.allLeases.filter((l) => l.status === 'ended')
  const terminatedLeases = data.allLeases.filter((l) => l.status === 'terminated')

  const expiringSoon = activeLeases.filter((l) => {
    if (!l.lease_end) return false
    const days = differenceInDays(new Date(l.lease_end), new Date())
    return days >= 0 && days <= 30
  })

  const overdueLeases = activeLeases.filter((l) => {
    if (!l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) < 0
  })

  const openEndedLeases = activeLeases.filter((l) => !l.lease_end)

  const avgDuration = endedLeases.length > 0
    ? Math.round(
        endedLeases
          .filter((l) => l.lease_end)
          .reduce((sum, l) => sum + differenceInMonths(new Date(l.lease_end!), new Date(l.lease_start)), 0)
        / endedLeases.filter((l) => l.lease_end).length
      )
    : 0

  const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)

  const stats = [
    { label: 'Active leases', value: activeLeases.length, sub: `${openEndedLeases.length} open ended`, color: 'text-emerald-600' },
    { label: 'Expiring soon', value: expiringSoon.length, sub: 'Within 30 days', color: expiringSoon.length > 0 ? 'text-amber-600' : 'text-gray-400' },
    { label: 'Overdue', value: overdueLeases.length, sub: 'Expired but still active', color: overdueLeases.length > 0 ? 'text-red-500' : 'text-gray-400' },
    { label: 'Monthly rent value', value: `$${totalMonthlyRent.toLocaleString()}`, sub: 'From active leases', color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {overdueLeases.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">
            ⚠ {overdueLeases.length} overdue lease{overdueLeases.length > 1 ? 's' : ''} — expired but still active
          </p>
          <div className="space-y-2">
            {overdueLeases.map((l) => {
              const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
              const daysOver = Math.abs(differenceInDays(new Date(l.lease_end!), new Date()))
              return (
                <div key={l.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{l.units?.unit_code} · {l.units?.buildings?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-600">{daysOver} days overdue</p>
                    <p className="text-xs text-gray-400">Ended {format(new Date(l.lease_end!), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Expiring within 30 days</p>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">✓ No leases expiring soon</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-3 gap-2 pb-2 border-b border-gray-100">
                <span className="text-[10px] font-semibold text-gray-400">Tenant</span>
                <span className="text-[10px] font-semibold text-gray-400 text-center">Expires</span>
                <span className="text-[10px] font-semibold text-gray-400 text-right">Days left</span>
              </div>
              {expiringSoon
                .sort((a, b) => differenceInDays(new Date(a.lease_end!), new Date()) - differenceInDays(new Date(b.lease_end!), new Date()))
                .map((l) => {
                  const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
                  const daysLeft = differenceInDays(new Date(l.lease_end!), new Date())
                  return (
                    <div key={l.id} className="grid grid-cols-3 gap-2 py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{l.units?.unit_code}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-gray-500">{format(new Date(l.lease_end!), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-amber-600' : 'text-gray-700'}`}>
                          {daysLeft}d
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Lease history summary</p>
          <div className="space-y-4">
            {[
              { label: 'Active', value: activeLeases.length, color: 'bg-emerald-500' },
              { label: 'Ended', value: endedLeases.length, color: 'bg-gray-400' },
              { label: 'Terminated', value: terminatedLeases.length, color: 'bg-red-400' },
            ].map((item) => {
              const pct = data.allLeases.length > 0 ? Math.round((item.value / data.allLeases.length) * 100) : 0
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Total leases</p>
              <p className="text-xl font-bold text-gray-900">{data.allLeases.length}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Avg. duration</p>
              <p className="text-xl font-bold text-gray-900">{avgDuration > 0 ? `${avgDuration}mo` : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
