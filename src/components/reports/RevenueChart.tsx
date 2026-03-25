'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'

interface MonthData {
  label: string
  month: string   // yyyy-MM
  value: number
}

interface RevenueChartProps {
  data: MonthData[]
  currentMonth: string    // yyyy-MM
  variant?: 'light' | 'dark'
  height?: number
  /** Show a dashed average reference line */
  showAvg?: boolean
  
  className?: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
  isDark: boolean
}

function CustomTooltip({ active, payload, label, isDark }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className={cn(
      'px-3 py-2 rounded-xl text-[11px] shadow-xl border',
      isDark
        ? 'bg-[#1a1f2e] border-white/10 text-white'
        : 'bg-white border-gray-100 text-gray-900',
    )}>
      <p className={cn('font-semibold mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-bold">${p.value.toLocaleString()}</span>
          {payload.length > 1 && <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{p.name}</span>}
        </div>
      ))}
    </div>
  )
}

export function RevenueChart({
  data,
  currentMonth,
  variant = 'light',
  height = 140,
  showAvg = false,
  className,
}: RevenueChartProps) {
  const isDark = variant === 'dark'
  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0
  const maxVal = Math.max(...data.map(d => d.value), 1)

  // Color per bar
  const getColor = (month: string, value: number) => {
    if (month === currentMonth) return isDark ? '#6366f1' : '#059669'
    if (value === maxVal && value > 0) return isDark ? '#4f46e5' : '#047857'
    return isDark ? 'rgba(99,102,241,0.4)' : '#a7f3d0'
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {showAvg && (
            <ReferenceLine
              y={avg}
              stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              strokeDasharray="4 3"
            />
          )}
          <CartesianGrid
            vertical={false}
            stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 9,
              fill: isDark ? '#4b5563' : '#9ca3af',
              fontWeight: 500,
            }}
            dy={6}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
            content={<CustomTooltip isDark={isDark} />}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.month, entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

