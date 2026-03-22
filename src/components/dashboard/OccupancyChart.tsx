'use client'

import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

// ── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label, suffix = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="text-slate-500 font-medium mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-slate-600">{p.name ?? p.dataKey}:</span>
          <span className="font-bold text-slate-900 tabular-nums">
            {p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Occupancy area chart ──────────────────────────────────────
interface OccupancyData { month: string; rate: number }

interface OccupancyChartProps {
  data: OccupancyData[]
  currentRate: number
}

export function OccupancyAreaChart({ data, currentRate }: OccupancyChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-teal-500/4 to-transparent pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trend</p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">Occupancy Rate</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-bold text-teal-700 tabular-nums">{currentRate}%</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={188}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              {/* Glow filter */}
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              domain={[40, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip suffix="%" />} />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#14b8a6"
              strokeWidth={2.5}
              fill="url(#occGrad)"
              dot={{ fill: '#14b8a6', strokeWidth: 2, stroke: '#fff', r: 3 }}
              activeDot={{ r: 5, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
              filter="url(#lineGlow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ── Lease expirations bar chart ───────────────────────────────
interface ExpirationData { month: string; count: number }

interface LeaseExpirationsChartProps {
  data: ExpirationData[]
}

export function LeaseExpirationsChart({ data }: LeaseExpirationsChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#1B3B6F]/4 to-transparent pointer-events-none" />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">Lease Expirations</h3>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={188}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1B3B6F" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#1B3B6F" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="url(#barGrad)"
              radius={[5, 5, 0, 0]}
              maxBarSize={36}
              name="Leases"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ── Legacy default export for backward compat ─────────────────
interface OccupancyChartLegacyProps {
  occupied: number
  vacant: number
}

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

export default function OccupancyChart({ occupied, vacant }: OccupancyChartLegacyProps) {
  const data = getLast6Months()
  if (data.length > 0) {
    data[data.length - 1].occupied = occupied
    data[data.length - 1].vacant   = vacant
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-teal-500/4 to-transparent pointer-events-none" />
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overview</p>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">Occupancy</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              Occupied
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              Vacant
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="occColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vacColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="occupied" stroke="#14b8a6" strokeWidth={2.5} fill="url(#occColor)" name="Occupied"
              dot={{ fill: '#14b8a6', strokeWidth: 2, stroke: '#fff', r: 3 }}
              activeDot={{ r: 5, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area type="monotone" dataKey="vacant" stroke="#f59e0b" strokeWidth={2} fill="url(#vacColor)" name="Vacant"
              dot={{ fill: '#f59e0b', strokeWidth: 2, stroke: '#fff', r: 3 }}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
