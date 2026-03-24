'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KpiVariant = 'light' | 'dark'

interface Trend {
  value: number   // e.g. +12 or -5 (percent)
  label?: string  // e.g. "vs last month"
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: Trend
  icon?: React.ComponentType<{ className?: string }>
  /** 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'sky' | 'indigo' | 'teal' | 'gray' */
  accent?: string
  variant?: KpiVariant
  className?: string
  onClick?: () => void
}

const ACCENTS: Record<string, { value: string; icon: string; badge: string; bg: string }> = {
  emerald: { value: 'text-emerald-600',  icon: 'text-emerald-500',  badge: 'bg-emerald-50',  bg: 'bg-emerald-50' },
  blue:    { value: 'text-blue-600',     icon: 'text-blue-500',     badge: 'bg-blue-50',     bg: 'bg-blue-50' },
  violet:  { value: 'text-violet-600',   icon: 'text-violet-500',   badge: 'bg-violet-50',   bg: 'bg-violet-50' },
  amber:   { value: 'text-amber-600',    icon: 'text-amber-500',    badge: 'bg-amber-50',    bg: 'bg-amber-50' },
  rose:    { value: 'text-rose-600',     icon: 'text-rose-500',     badge: 'bg-rose-50',     bg: 'bg-rose-50' },
  sky:     { value: 'text-sky-600',      icon: 'text-sky-500',      badge: 'bg-sky-50',      bg: 'bg-sky-50' },
  indigo:  { value: 'text-indigo-600',   icon: 'text-indigo-500',   badge: 'bg-indigo-50',   bg: 'bg-indigo-50' },
  teal:    { value: 'text-teal-600',     icon: 'text-teal-500',     badge: 'bg-teal-50',     bg: 'bg-teal-50' },
  gray:    { value: 'text-gray-800',     icon: 'text-gray-400',     badge: 'bg-gray-100',    bg: 'bg-gray-50' },
}

// Dark-mode accents (for commercial / mixed dark backgrounds)
const DARK_ACCENTS: Record<string, { value: string; icon: string; bg: string }> = {
  emerald: { value: 'text-emerald-400', icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  blue:    { value: 'text-sky-400',     icon: 'text-sky-500',     bg: 'bg-sky-500/10' },
  violet:  { value: 'text-violet-400',  icon: 'text-violet-500',  bg: 'bg-violet-500/10' },
  amber:   { value: 'text-amber-400',   icon: 'text-amber-500',   bg: 'bg-amber-500/10' },
  rose:    { value: 'text-rose-400',    icon: 'text-rose-500',    bg: 'bg-rose-500/10' },
  sky:     { value: 'text-sky-400',     icon: 'text-sky-400',     bg: 'bg-sky-500/10' },
  indigo:  { value: 'text-indigo-400',  icon: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  teal:    { value: 'text-teal-400',    icon: 'text-teal-400',    bg: 'bg-teal-500/10' },
  gray:    { value: 'text-gray-300',    icon: 'text-gray-600',    bg: 'bg-white/[0.04]' },
}

export function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent = 'gray',
  variant = 'light',
  className,
  onClick,
}: KpiCardProps) {
  const isDark = variant === 'dark'
  const c = isDark ? DARK_ACCENTS[accent] ?? DARK_ACCENTS.gray : ACCENTS[accent] ?? ACCENTS.gray

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-2xl p-5 transition-all duration-200 group',
        isDark
          ? 'bg-[#0f1117] border border-white/[0.06] hover:border-white/[0.12]'
          : 'bg-white border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* subtle hover glow for dark cards */}
      {isDark && (
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />
      )}

      <div className="relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <p className={cn(
            'text-[10px] font-semibold tracking-[0.12em] uppercase',
            isDark ? 'text-gray-500' : 'text-gray-400',
          )}>
            {label}
          </p>
          {Icon && (
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', c.bg)}>
              <Icon className={cn('h-3.5 w-3.5', c.icon)} />
            </div>
          )}
        </div>

        {/* Value */}
        <p className={cn('text-[26px] font-bold tracking-tight leading-none', c.value)}>
          {value}
        </p>

        {/* Sub text */}
        {sub && (
          <p className={cn('text-[11px] mt-1.5', isDark ? 'text-gray-600' : 'text-gray-400')}>
            {sub}
          </p>
        )}

        {/* Trend */}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 mt-2 text-[10px] font-semibold',
            trend.value >= 0 ? 'text-emerald-500' : 'text-rose-500',
          )}>
            {trend.value >= 0
              ? <ArrowUpRight className="h-3 w-3" />
              : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value)}%
            {trend.label && <span className={cn('font-normal', isDark ? 'text-gray-600' : 'text-gray-400')}> {trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
