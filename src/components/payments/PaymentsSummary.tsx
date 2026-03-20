'use client'

import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
  paidTenantsCount: number
  totalActiveLeases: number
  methodBreakdown: { method: string; amount: number; count: number }[]
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#6366f1',
  bank_transfer: '#10b981',
  mobile_money: '#f59e0b',
  cheque: '#3b82f6',
  other: '#94a3b8',
}

export default function PaymentsSummary({
  expectedMonthly,
  collectedThisMonth,
  outstandingBalance,
  paidTenantsCount,
  totalActiveLeases,
  methodBreakdown,
}: Props) {
  const collectionRate = expectedMonthly > 0
    ? Math.round((collectedThisMonth / expectedMonthly) * 100)
    : 0

  const cards = [
    {
      label: 'Expected this month',
      value: expectedMonthly.toLocaleString(),
      sub: `From ${totalActiveLeases} active lease${totalActiveLeases !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Collected this month',
      value: collectedThisMonth.toLocaleString(),
      sub: `${collectionRate}% collection rate`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      showBar: true,
    },
    {
      label: 'Outstanding balance',
      value: outstandingBalance.toLocaleString(),
      sub: `${totalActiveLeases - paidTenantsCount} tenant${totalActiveLeases - paidTenantsCount !== 1 ? 's' : ''} yet to pay`,
      icon: AlertCircle,
      color: outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400',
      bg: outstandingBalance > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      label: 'Tenants paid',
      value: `${paidTenantsCount} / ${totalActiveLeases}`,
      sub: 'This month',
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  const chartData = methodBreakdown
    .filter((m) => m.amount > 0)
    .map((m) => ({
      name: m.method.replace('_', ' '),
      value: m.amount,
      count: m.count,
    }))

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="border border-slate-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg} shrink-0`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              {card.showBar && (
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Method breakdown */}
      {chartData.length > 0 && (
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Payment method breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={METHOD_COLORS[entry.name.replace(' ', '_')] ?? '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), 'Amount']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 space-y-2">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: METHOD_COLORS[item.name.replace(' ', '_')] ?? '#94a3b8' }}
                      />
                      <span className="text-sm text-slate-600 capitalize">{item.name}</span>
                      <span className="text-xs text-slate-400">({item.count})</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

