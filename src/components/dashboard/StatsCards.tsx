'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useAnimation, useInView } from 'framer-motion'
import {
  Building2, Home, Users, FileText,
  TrendingUp, TrendingDown, Minus, ArrowUpRight, DollarSign, Briefcase, Clock
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'

function Ticker({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  
  useEffect(() => {
    let start: number | null = null
    let rafId: number
    const from = 0
    const to = value

    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / (duration * 1000), 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(from + (to - from) * easeOutQuart))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }
    
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [value, duration])

  return <>{display.toLocaleString()}</>
}

function MiniSparkline({ data, color }: { data: number[], color: string }) {
  const chartData = data.map((val, i) => ({ i, val }))
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="val" stroke={color} fill={`url(#spark-${color})`} strokeWidth={2} isAnimationActive={true} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function TrendIndicator({ pctChange }: { pctChange: number }) {
  if (pctChange > 0) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
        <TrendingUp className="h-3 w-3" />
        <span>+{pctChange.toFixed(1)}%</span>
      </div>
    )
  }
  if (pctChange < 0) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
        <TrendingDown className="h-3 w-3" />
        <span>{pctChange.toFixed(1)}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
      <Minus className="h-3 w-3" />
      <span>0%</span>
    </div>
  )
}

export interface StatCardProps {
  label: string
  value: number | string
  isCurrency?: boolean
  pctChange: number
  trendData: number[]
  icon: any
  iconColor: string
  iconBg: string
  href?: string
}

function StatCard({ card, index }: { card: StatCardProps, index: number }) {
  const router = useRouter()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
      onClick={() => card.href && router.push(card.href)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
          <card.icon className={`h-5 w-5 ${card.iconColor}`} />
        </div>
        <TrendIndicator pctChange={card.pctChange} />
      </div>
      
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {card.isCurrency && '$'}
            {typeof card.value === 'number' ? <Ticker value={card.value} /> : card.value}
          </div>
          <MiniSparkline data={card.trendData} color={card.pctChange >= 0 ? '#10b981' : '#f43f5e'} />
        </div>
      </div>
    </motion.div>
  )
}

interface StatsCardsProps {
  propertyType: 'residential' | 'commercial'
  data: any // Processed data from dashboard
}

export default function StatsCards({ propertyType, data }: StatsCardsProps) {
  const cards: StatCardProps[] = propertyType === 'residential' ? [
    {
      label: 'Total Buildings',
      value: data.totalBuildings,
      pctChange: data.buildingsChange,
      trendData: data.buildingsTrend,
      icon: Building2,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      href: '/buildings'
    },
    {
      label: 'Occupied Units',
      value: `${data.occupiedUnits} / ${data.totalUnits}`,
      pctChange: data.occupancyChange,
      trendData: data.occupancyTrend,
      icon: Home,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      href: '/buildings'
    },
    {
      label: 'Active Tenants',
      value: data.activeTenants,
      pctChange: data.tenantsChange,
      trendData: data.tenantsTrend,
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      href: '/tenants'
    },
    {
      label: 'Rent Collected',
      value: data.monthlyCollected,
      isCurrency: true,
      pctChange: data.revenueChange,
      trendData: data.revenueTrend,
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      href: '/payments'
    }
  ] : [
    {
      label: 'Leasable Area (sqm)',
      value: data.totalArea,
      pctChange: data.areaChange,
      trendData: data.areaTrend,
      icon: Building2,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      href: '/buildings'
    },
    {
      label: 'Occupied Units',
      value: `${data.occupiedUnits} / ${data.totalUnits}`,
      pctChange: data.occupancyChange,
      trendData: data.occupancyTrend,
      icon: Briefcase,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      href: '/buildings'
    },
    {
      label: 'Active Companies',
      value: data.activeTenants,
      pctChange: data.tenantsChange,
      trendData: data.tenantsTrend,
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      href: '/companies'
    },
    {
      label: 'Revenue Collected',
      value: data.monthlyCollected,
      isCurrency: true,
      pctChange: data.revenueChange,
      trendData: data.revenueTrend,
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      href: '/invoices'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <StatCard key={card.label} card={card} index={i} />
      ))}
    </div>
  )
}
