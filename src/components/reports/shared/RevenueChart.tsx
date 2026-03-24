'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/card'

interface RevenueData {
  label: string
  short: string
  value: number
  month: string
}

interface RevenueChartProps {
  data: RevenueData[]
  totalCollected: number
  currentMonth: string
}

export function RevenueChart({ data, totalCollected, currentMonth }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map(d => d.value), 1)

  return (
    <Card className="border border-gray-100 shadow-sm p-6 bg-white/70 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Revenue Intelligence</h3>
          <p className="text-xs text-gray-400 mt-1">Actual rent & service charges collected</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">
            ${totalCollected.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">12-Month Total</p>
        </div>
      </div>
      
      <div className="h-48 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="short" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
            />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-800">
                      <p className="font-semibold mb-1">{payload[0].payload.label}</p>
                      <p className="text-emerald-400 font-bold">${payload[0].value?.toLocaleString()}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => {
                const isCurrent = entry.month === currentMonth
                const isHighest = entry.value === maxRevenue
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isCurrent ? '#059669' : isHighest ? '#10b981' : '#d1fae5'} 
                    style={{ transition: 'all 0.3s ease' }}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

