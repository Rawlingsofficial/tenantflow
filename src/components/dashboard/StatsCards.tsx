'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2, Home, Users, FileText,
  TrendingUp, AlertTriangle, ArrowUpRight
} from 'lucide-react'
import type { DashboardStats } from '@/types'

// ── Animated number ticker ─────────────────────────────────────
function Ticker({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    start.current = null
    const from = 0
    const to = value
    function step(ts: number) {
      if (!start.current) start.current = ts
      const elapsed = ts - start.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration])

  return <>{display.toLocaleString()}</>
}

// ── Spotlight effect on card hover ────────────────────────────
function SpotlightCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: '50%', y: '50%' })
  const [hovered, setHovered] = useState(false)

  function handleMove(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={
        {
          '--mouse-x': pos.x,
          '--mouse-y': pos.y,
        } as React.CSSProperties
      }
    >
      {/* Spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-2xl z-10"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(320px circle at ${pos.x} ${pos.y}, rgba(20,184,166,0.07), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

// ── Card config ────────────────────────────────────────────────
interface CardConfig {
  label: string
  value: number
  sub: string
  icon: React.ElementType
  accent: string
  iconBg: string
  iconColor: string
  trend?: string
  trendUp?: boolean
  alert?: boolean
  href?: string
}

function getCards(stats: DashboardStats): CardConfig[] {
  return [
    {
      label: 'Total Buildings',
      value: stats.totalBuildings,
      sub: 'Active properties',
      icon: Building2,
      accent: 'from-[#1B3B6F]/8 to-transparent',
      iconBg: 'bg-[#1B3B6F]',
      iconColor: 'text-[#14b8a6]',
      href: '/buildings',
    },
    {
      label: 'Total Units',
      value: stats.totalUnits,
      sub: `${stats.occupiedUnits} occupied · ${stats.vacantUnits} vacant`,
      icon: Home,
      accent: 'from-teal-500/6 to-transparent',
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600',
      trend: `${stats.occupancyRate ?? Math.round((stats.occupiedUnits / Math.max(stats.totalUnits, 1)) * 100)}% occupancy`,
      trendUp: true,
      href: '/buildings',
    },
    {
      label: 'Active Tenants',
      value: stats.activeTenants,
      sub: `${stats.activeLeases} active leases`,
      icon: Users,
      accent: 'from-blue-500/6 to-transparent',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      href: '/tenants',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringLeases,
      sub: 'Leases need renewal',
      icon: FileText,
      accent: stats.expiringLeases > 0 ? 'from-amber-500/8 to-transparent' : 'from-slate-200/30 to-transparent',
      iconBg: stats.expiringLeases > 0 ? 'bg-amber-500/10' : 'bg-slate-100',
      iconColor: stats.expiringLeases > 0 ? 'text-amber-600' : 'text-slate-400',
      alert: stats.expiringLeases > 0,
      href: '/leases',
    },
  ]
}

interface StatsCardsProps {
  stats: DashboardStats
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {getCards(stats).map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <SpotlightCard
            className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            onClick={card.href ? () => router.push(card.href!) : undefined}
          >
            {/* Top accent gradient */}
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${card.accent} pointer-events-none rounded-t-2xl`} />

            <div className="relative z-20 p-5">
              <div className="flex items-start justify-between mb-4">
                {/* Icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${card.iconBg} shrink-0`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>

                {/* Arrow or alert indicator */}
                {card.alert ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200/70 rounded-lg">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Alert</span>
                  </div>
                ) : card.href ? (
                  <div className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </div>

              {/* Value */}
              <div className="mb-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-slate-900 leading-none tabular-nums">
                  <Ticker value={card.value} />
                </p>
              </div>

              {/* Sub */}
              <p className="text-xs text-slate-400 mt-2">{card.sub}</p>

              {/* Trend badge */}
              {card.trend && (
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                  <TrendingUp className="h-3 w-3 text-teal-500" />
                  <span className="text-xs font-medium text-teal-600">{card.trend}</span>
                </div>
              )}

              {/* Alert action */}
              {card.alert && (
                <div className="mt-3 pt-3 border-t border-amber-100/60">
                  <span className="text-xs text-amber-600 font-medium">
                    {stats.expiringLeases} lease{stats.expiringLeases !== 1 ? 's' : ''} need attention →
                  </span>
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  )
}
