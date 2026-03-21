'use client'

import { format, isSameMonth, subMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import type { ReportData } from '@/types/reports'

interface Props { data: ReportData }

export default function RevenueReport({ data }: Props) {
  const now = new Date()

  const activeLeases = data.allLeases.filter(l => l.status === 'active')

  // Last 6 months revenue
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const collected = data.allPayments
      .filter(p => p.status === 'completed' && isSameMonth(new Date(p.payment_date), month))
      .reduce((sum, p) => sum + Number(p.amount), 0)
    return {
      month: format(month, 'MMM'),
      collected,
      expected: activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0),
    }
  })

  const expectedMonthly = activeLeases.reduce((sum, l) => sum + Number(l.rent_amount), 0)
  const collectedThisMonth = data.allPayments
    .filter(p => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const collectionRate = expectedMonthly > 0 ? Math.round((collectedThisMonth / expectedMonthly) * 100) : 0
  const totalAllTime = data.allPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Payment method breakdown
  const methodBreakdown = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
    .map(method => {
      const mp = data.allPayments.filter(p => (p.method ?? 'other') === method && p.status === 'completed')
      return { method: method.replace('_', ' '), amount: mp.reduce((s, p) => s + Number(p.amount), 0), count: mp.length }
    })
    .filter(m => m.count > 0)
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Expected this month', value: `$${expectedMonthly.toLocaleString()}`, sub: `${activeLeases.length} active leases`, color: 'text-gray-800' },
          { label: 'Collected this month', value: `$${collectedThisMonth.toLocaleString()}`, sub: `${collectionRate}% collection rate`, color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${Math.max(0, expectedMonthly - collectedThisMonth).toLocaleString()}`, sub: 'This month', color: expectedMonthly > collectedThisMonth ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Total collected', value: `$${totalAllTime.toLocaleString()}`, sub: 'All time', color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Monthly Revenue — Last 6 Months</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={last6Months} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Collected']}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
            />
            <Bar dataKey="collected" fill="#059669" radius={[6, 6, 0, 0]} name="Collected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment method breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Payment Methods</p>
          {methodBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {methodBreakdown.map(m => {
                const pct = totalAllTime > 0 ? Math.round((m.amount / totalAllTime) * 100) : 0
                return (
                  <div key={m.method} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 capitalize font-medium">{m.method}</span>
                        <span className="text-xs text-gray-400">({m.count})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{pct}%</span>
                        <span className="text-sm font-bold text-gray-900">${m.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Collection rate progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">This Month Collection</p>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f0fdf4" strokeWidth="14" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#059669" strokeWidth="14"
                  strokeDasharray={`${(Math.min(collectionRate, 100) / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{collectionRate}%</span>
                <span className="text-[10px] text-gray-400">collected</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium">Collected</p>
                <p className="text-lg font-bold text-emerald-700">${collectedThisMonth.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-600 font-medium">Outstanding</p>
                <p className="text-lg font-bold text-amber-700">${Math.max(0, expectedMonthly - collectedThisMonth).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
