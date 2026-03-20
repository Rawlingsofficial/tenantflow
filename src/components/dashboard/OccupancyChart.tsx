'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Generate last 6 months of mock data until real data is wired
function getLast6Months() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      occupied: 0,
      vacant: 0,
    })
  }
  return months
}

interface OccupancyChartProps {
  occupied: number
  vacant: number
}

export default function OccupancyChart({ occupied, vacant }: OccupancyChartProps) {
  const data = getLast6Months()

  // Set current month to real values
  if (data.length > 0) {
    data[data.length - 1].occupied = occupied
    data[data.length - 1].vacant = vacant
  }

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          Occupancy overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="occupied" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vacant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Area type="monotone" dataKey="occupied" stroke="#6366f1" strokeWidth={2} fill="url(#occupied)" name="Occupied" />
            <Area type="monotone" dataKey="vacant" stroke="#f59e0b" strokeWidth={2} fill="url(#vacant)" name="Vacant" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

