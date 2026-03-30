//src/components/reports/shared/KpiCard.tsx
'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subValue?: string
  trend?: number
  icon: LucideIcon
  colorClass?: string
  trendLabel?: string
}

export function KpiCard({ title, value, subValue, trend, icon: Icon, colorClass = 'text-gray-900', trendLabel }: KpiCardProps) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="relative overflow-hidden border border-gray-100 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 transition-all hover:shadow-md hover:border-gray-200">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
            <h2 className={`text-3xl font-extrabold tracking-tight ${colorClass}`}>{value}</h2>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 shadow-inner">
            <Icon size={20} strokeWidth={2} />
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          {trend !== undefined && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
              trend < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
              'bg-gray-50 text-gray-600 border border-gray-100'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
          {subValue && <p className="text-xs text-gray-500 font-medium">{subValue}</p>}
          {trendLabel && trend !== undefined && <p className="text-[10px] text-gray-400 ml-auto">{trendLabel}</p>}
        </div>
        
        {/* Premium Gradient Accent */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-full opacity-50 pointer-events-none" />
      </Card>
    </motion.div>
  )
}
