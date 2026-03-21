'use client'

import { Building2, Home, Users, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import type { ReportData } from '@/types/reports'

interface Props { data: ReportData }

export default function PortfolioReport({ data }: Props) {
  const occupancyData = [
    { name: 'Occupancy', value: data.occupancyRate, fill: '#6366f1' },
  ]

  const stats = [
    {
      label: 'Total buildings',
      value: data.totalBuildings,
      sub: 'Active properties',
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total units',
      value: data.totalUnits,
      sub: `${data.vacantUnits} vacant · ${data.maintenanceUnits} maintenance`,
      icon: Home,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Occupied units',
      value: data.occupiedUnits,
      sub: `Out of ${data.totalUnits} total`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Occupancy rate',
      value: `${data.occupancyRate}%`,
      sub: data.occupancyRate >= 80 ? 'Excellent' : data.occupancyRate >= 60 ? 'Good' : 'Needs attention',
      icon: TrendingUp,
      color: data.occupancyRate >= 80 ? 'text-emerald-600' : data.occupancyRate >= 60 ? 'text-amber-600' : 'text-red-500',
      bg: data.occupancyRate >= 80 ? 'bg-emerald-50' : data.occupancyRate >= 60 ? 'bg-amber-50' : 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-slate-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupancy donut */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Occupancy breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={160} height={160}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="60%" outerRadius="80%"
                  data={occupancyData}
                  startAngle={90} endAngle={-270}
                >
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold" fill="#1e293b" fontSize={24} fontWeight={700}>
                    {data.occupancyRate}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>

              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600">Occupied</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{data.occupiedUnits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-sm text-slate-600">Vacant</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{data.vacantUnits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="text-sm text-slate-600">Maintenance</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{data.maintenanceUnits}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Total</span>
                    <span className="text-sm font-bold text-slate-900">{data.totalUnits}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit status breakdown */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Portfolio health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Occupancy rate',
                value: data.occupancyRate,
                max: 100,
                color: 'bg-indigo-500',
                suffix: '%',
                note: data.occupancyRate >= 80 ? '✓ Healthy' : '⚠ Below target',
                noteColor: data.occupancyRate >= 80 ? 'text-emerald-600' : 'text-amber-600',
              },
              {
                label: 'Vacant units',
                value: data.totalUnits > 0 ? Math.round((data.vacantUnits / data.totalUnits) * 100) : 0,
                max: 100,
                color: 'bg-amber-400',
                suffix: '%',
                note: `${data.vacantUnits} unit${data.vacantUnits !== 1 ? 's' : ''} available`,
                noteColor: 'text-slate-500',
              },
              {
                label: 'Under maintenance',
                value: data.totalUnits > 0 ? Math.round((data.maintenanceUnits / data.totalUnits) * 100) : 0,
                max: 100,
                color: 'bg-red-400',
                suffix: '%',
                note: `${data.maintenanceUnits} unit${data.maintenanceUnits !== 1 ? 's' : ''} offline`,
                noteColor: 'text-slate-500',
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{item.note}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {item.value}{item.suffix}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.min(item.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Key insight */}
            <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${
              data.occupancyRate >= 80
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : data.occupancyRate >= 60
                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {data.occupancyRate >= 80
                ? `✓ Your portfolio is performing well with ${data.occupancyRate}% occupancy.`
                : data.occupancyRate >= 60
                  ? `⚠ ${data.vacantUnits} vacant unit${data.vacantUnits !== 1 ? 's' : ''} are reducing your revenue potential.`
                  : `⚠ High vacancy rate. Focus on filling ${data.vacantUnits} vacant unit${data.vacantUnits !== 1 ? 's' : ''}.`
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

