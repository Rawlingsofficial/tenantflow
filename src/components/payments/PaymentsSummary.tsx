'use client'

import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Home, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
  paidTenantsCount: number
  totalActiveLeases: number
  methodBreakdown: { method: string; amount: number; count: number }[]
  residentialTotal?: number
  commercialTotal?: number
  isMixed?: boolean
}

const METHOD_COLORS: Record<string, string> = {
  cash:          '#14b8a6',
  bank_transfer: '#1B3B6F',
  mobile_money:  '#f59e0b',
  cheque:        '#0d9488',
  other:         '#94a3b8',
}
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money', cheque: 'Cheque', other: 'Other',
}

export default function PaymentsSummary({
  expectedMonthly, collectedThisMonth, outstandingBalance,
  paidTenantsCount, totalActiveLeases, methodBreakdown,
  residentialTotal, commercialTotal, isMixed,
}: Props) {
  const collectionRate = expectedMonthly > 0
    ? Math.round((collectedThisMonth / expectedMonthly) * 100) : 0

  const cards = [
    {
      label: 'Expected this month',
      value: `$${expectedMonthly.toLocaleString()}`,
      sub: `From ${totalActiveLeases} active lease${totalActiveLeases !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      iconBg: 'bg-[#1B3B6F]', iconColor: 'text-[#14b8a6]',
      accentFrom: 'from-[#1B3B6F]/6', valueColor: 'text-slate-900',
    },
    {
      label: 'Collected this month',
      value: `$${collectedThisMonth.toLocaleString()}`,
      sub: `${collectionRate}% collection rate`,
      icon: CheckCircle2,
      iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600',
      accentFrom: 'from-teal-500/5', valueColor: 'text-teal-600',
      showBar: true,
    },
    {
      label: 'Outstanding',
      value: `$${outstandingBalance.toLocaleString()}`,
      sub: `${totalActiveLeases - paidTenantsCount} tenant${totalActiveLeases - paidTenantsCount !== 1 ? 's' : ''} yet to pay`,
      icon: AlertCircle,
      iconBg: outstandingBalance > 0 ? 'bg-red-500/10' : 'bg-slate-100',
      iconColor: outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400',
      accentFrom: outstandingBalance > 0 ? 'from-red-500/5' : 'from-slate-200/20',
      valueColor: outstandingBalance > 0 ? 'text-red-500' : 'text-slate-400',
    },
    {
      label: 'Tenants paid',
      value: `${paidTenantsCount} / ${totalActiveLeases}`,
      sub: 'This month',
      icon: DollarSign,
      iconBg: 'bg-[#1B3B6F]/8', iconColor: 'text-[#1B3B6F]',
      accentFrom: 'from-[#1B3B6F]/4', valueColor: 'text-slate-800',
    },
  ]

  const chartData = methodBreakdown
    .filter(m => m.amount > 0)
    .map(m => ({ name: m.method, label: METHOD_LABEL[m.method] ?? m.method, value: m.amount, count: m.count }))

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm px-4 py-3.5 overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${card.accentFrom} to-transparent pointer-events-none`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${card.valueColor}`}>{card.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${card.iconBg} shrink-0`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            {card.showBar && (
              <div className="relative mt-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(collectionRate, 100)}%` }}
                    transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Mixed portfolio split */}
      {isMixed && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-teal-200/80 rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Home className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Residential</p>
                <p className="text-lg font-bold text-teal-700 tabular-nums">${(residentialTotal ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">🏠 Residential</span>
          </div>
          <div className="bg-white border border-[#1B3B6F]/20 rounded-2xl px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1B3B6F]/8 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-[#1B3B6F]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Commercial</p>
                <p className="text-lg font-bold text-[#1B3B6F] tabular-nums">${(commercialTotal ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20">🏢 Commercial</span>
          </div>
        </div>
      )}

      {/* Method breakdown */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Payment Method Breakdown</p>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={3} dataKey="value">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={METHOD_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {chartData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: METHOD_COLORS[item.name] ?? '#94a3b8' }} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-[11px] text-slate-400">({item.count})</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 tabular-nums">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


