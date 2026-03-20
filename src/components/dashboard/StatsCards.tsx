'use client'

import { Building2, Home, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
}

const cards = (stats: DashboardStats) => [
  {
    label: 'Total buildings',
    value: stats.totalBuildings,
    sub: 'Active properties',
    icon: Building2,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    label: 'Total units',
    value: stats.totalUnits,
    sub: `${stats.vacantUnits} vacant · ${stats.occupiedUnits} occupied`,
    icon: Home,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Active tenants',
    value: stats.activeTenants,
    sub: `${stats.activeLeases} active leases`,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Expiring this month',
    value: stats.expiringLeases,
    sub: 'Leases need renewal',
    icon: AlertCircle,
    color: stats.expiringLeases > 0 ? 'text-amber-600' : 'text-slate-400',
    bg: stats.expiringLeases > 0 ? 'bg-amber-50' : 'bg-slate-50',
  },
]

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards(stats).map((card) => (
        <Card key={card.label} className="border border-slate-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                <p className="text-3xl font-semibold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
