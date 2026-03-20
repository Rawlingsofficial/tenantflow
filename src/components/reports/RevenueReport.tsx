'use client'

import { format, isSameMonth, subMonths, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import type { ReportData } from '@/app/(dashboard)/reports/page'

interface Props { data: ReportData }

export default function RevenueReport({ data }: Props) {
  const now = new Date()

  // Last 6 months revenue
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const collected = data.allPayments
      .filter((p) =>
        p.status === 'completed' &&
        isSameMonth(new Date(p.payment_date), month)
      )
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return {
      month: format(month, 'MMM'),
      collected,
      expected: data.activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0),
    }
  })

  // This month stats
  const expectedMonthly = data.activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)
  const collectedThisMonth = data.allPayments
    .filter((p) => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const collectionRate = expectedMonthly > 0
    ? Math.round((collectedThisMonth / expectedMonthly) * 100)
    : 0

  // Total collected all time
  const totalAllTime = data.allPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Payment method breakdown
  const methods = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
  const methodBreakdown = methods
    .map((method) => {
      const methodPayments = data.allPayments.filter(
        (p) => (p.method ?? 'other') === method && p.status === 'completed'
      )
      return {
        method: method.replace('_', ' '),
        amount: methodPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        count: methodPayments.length,
      }
    })
    .filter((m) => m.count > 0)
    .sort((a, b) => b.amount - a.amount)

  // Best paying tenants
  const tenantPayments = data.activeLeases.map((lease) => {
    const totalPaid = (lease.rent_payments ?? [])
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const monthsPaid = new Set(
      (lease.rent_payments ?? [])
        .filter((p) => p.status === 'completed')
        .map((p) => format(new Date(p.payment_date), 'yyyy-MM'))
    ).size
    const name = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
    return {
      name: name || 'Unknown',
      unit: lease.units?.unit_code ?? '—',
      building: lease.units?.buildings?.name ?? '—',
      totalPaid,
      monthsPaid,
      rent: Number(lease.rent_amount),
    }
  }).sort((a, b) => b.totalPaid - a.totalPaid)

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Expected this month',
            value: expectedMonthly.toLocaleString(),
            sub: `${data.activeLeases.length} active leases`,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            label: 'Collected this month',
            value: collectedThisMonth.toLocaleString(),
            sub: `${collectionRate}% collection rate`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Outstanding',
            value: Math.max(0, expectedMonthly - collectedThisMonth).toLocaleString(),
            sub: 'This month',
            color: expectedMonthly > collectedThisMonth ? 'text-red-500' : 'text-slate-400',
            bg: expectedMonthly > collectedThisMonth ? 'bg-red-50' : 'bg-slate-50',
          },
          {
            label: 'Total collected',
            value: totalAllTime.toLocaleString(),
            sub: 'All time',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
        ].map((s) => (
          <Card key={s.label} className="border border-slate-200 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                {s.label === 'Collected this month' && (
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Monthly revenue — last 6 months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last6Months} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), '']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="collected" fill="#6366f1" radius={[4, 4, 0, 0]} name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment method breakdown */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Payment methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methodBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {methodBreakdown.map((m) => {
                  const pct = totalAllTime > 0 ? Math.round((m.amount / totalAllTime) * 100) : 0
                  return (
                    <div key={m.method} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-700 capitalize font-medium">{m.method}</span>
                          <span className="text-xs text-slate-400">({m.count} payment{m.count !== 1 ? 's' : ''})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{pct}%</span>
                          <span className="text-sm font-bold text-slate-900">
                            {m.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top tenants by payment */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Tenant payment summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantPayments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No active leases</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 col-span-2">Tenant</span>
                  <span className="text-xs font-semibold text-slate-400 text-right">Months paid</span>
                  <span className="text-xs font-semibold text-slate-400 text-right">Total paid</span>
                </div>
                {tenantPayments.map((t, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.unit} · {t.building}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${
                        t.monthsPaid > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {t.monthsPaid}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {t.totalPaid.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

