'use client'

import { format, differenceInDays, differenceInMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReportData } from '@/app/(dashboard)/reports/page'

interface Props { data: ReportData }

export default function LeaseReport({ data }: Props) {
  const activeLeases = data.allLeases.filter((l) => l.status === 'active')
  const endedLeases = data.allLeases.filter((l) => l.status === 'ended')
  const terminatedLeases = data.allLeases.filter((l) => l.status === 'terminated')

  // Expiring soon — within 30 days
  const expiringSoon = activeLeases.filter((l) => {
    if (!l.lease_end) return false
    const days = differenceInDays(new Date(l.lease_end), new Date())
    return days >= 0 && days <= 30
  })

  // Already expired but still active
  const overdueLeases = activeLeases.filter((l) => {
    if (!l.lease_end) return false
    return differenceInDays(new Date(l.lease_end), new Date()) < 0
  })

  // Open ended leases
  const openEndedLeases = activeLeases.filter((l) => !l.lease_end)

  // Average lease duration (for ended leases)
  const avgDuration = endedLeases.length > 0
    ? Math.round(
        endedLeases
          .filter((l) => l.lease_end)
          .reduce((sum, l) => sum + differenceInMonths(new Date(l.lease_end!), new Date(l.lease_start)), 0)
        / endedLeases.filter((l) => l.lease_end).length
      )
    : 0

  // Total monthly rent from active leases
  const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)

  const stats = [
    {
      label: 'Active leases',
      value: activeLeases.length,
      sub: `${openEndedLeases.length} open ended`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Expiring soon',
      value: expiringSoon.length,
      sub: 'Within 30 days',
      color: expiringSoon.length > 0 ? 'text-amber-600' : 'text-slate-400',
      bg: expiringSoon.length > 0 ? 'bg-amber-50' : 'bg-slate-50',
    },
    {
      label: 'Overdue',
      value: overdueLeases.length,
      sub: 'Expired but still active',
      color: overdueLeases.length > 0 ? 'text-red-500' : 'text-slate-400',
      bg: overdueLeases.length > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      label: 'Monthly rent value',
      value: totalMonthlyRent.toLocaleString(),
      sub: 'From active leases',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-slate-200 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueLeases.length > 0 && (
        <Card className="border border-red-200 shadow-none bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-800">
              ⚠ Overdue leases — expired but still marked active ({overdueLeases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLeases.map((l) => {
                const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
                const daysOver = Math.abs(differenceInDays(new Date(l.lease_end!), new Date()))
                return (
                  <div key={l.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-400">
                        {l.units?.unit_code} · {l.units?.buildings?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-red-600">
                        {daysOver} days overdue
                      </p>
                      <p className="text-xs text-slate-400">
                        Ended {format(new Date(l.lease_end!), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring soon */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Expiring within 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                ✓ No leases expiring soon
              </p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 col-span-1">Tenant</span>
                  <span className="text-xs font-semibold text-slate-400 text-center">Expires</span>
                  <span className="text-xs font-semibold text-slate-400 text-right">Days left</span>
                </div>
                {expiringSoon
                  .sort((a, b) =>
                    differenceInDays(new Date(a.lease_end!), new Date()) -
                    differenceInDays(new Date(b.lease_end!), new Date())
                  )
                  .map((l) => {
                    const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim()
                    const daysLeft = differenceInDays(new Date(l.lease_end!), new Date())
                    return (
                      <div key={l.id} className="grid grid-cols-3 gap-2 py-2.5 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-400">{l.units?.unit_code}</p>
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-slate-500">
                            {format(new Date(l.lease_end!), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${
                            daysLeft <= 7 ? 'text-red-600'
                            : daysLeft <= 14 ? 'text-amber-600'
                            : 'text-slate-700'
                          }`}>
                            {daysLeft}d
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease history summary */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Lease history summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Active', value: activeLeases.length, color: 'bg-emerald-500', total: data.allLeases.length },
              { label: 'Ended', value: endedLeases.length, color: 'bg-slate-400', total: data.allLeases.length },
              { label: 'Terminated', value: terminatedLeases.length, color: 'bg-red-400', total: data.allLeases.length },
            ].map((item) => {
              const pct = data.allLeases.length > 0
                ? Math.round((item.value / data.allLeases.length) * 100)
                : 0
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{pct}%</span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Total leases</p>
                <p className="text-xl font-bold text-slate-900">{data.allLeases.length}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Avg. duration</p>
                <p className="text-xl font-bold text-slate-900">
                  {avgDuration > 0 ? `${avgDuration}mo` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

