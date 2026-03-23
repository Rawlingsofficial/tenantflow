/**
 * TenantFlow portfolio icons
 * Path: src/components/ui/portfolio-icons.tsx
 *
 * Usage:
 *   <PortfolioTag buildingType="commercial" />         — auto small pill
 *   <PortfolioTag buildingType="residential" size="lg"/> — large pill
 *   <HouseIcon className="w-4 h-4 text-sky-600" />
 *   <BuildingIcon className="w-4 h-4 text-[#1B3B6F]" />
 *   <PortfolioFilter value={portfolio} onChange={setPortfolio} counts={…} />
 */

import type { SVGProps } from 'react'

// ─── Standalone icons (currentColor, 16×16 viewBox) ───────────────

export function HouseIcon({ className = '', ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} {...p}>
      <polyline points="1,9 8,2 15,9"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
      <rect x="3" y="9" width="10" height="6" rx="1"
        stroke="currentColor" strokeWidth="1.4"/>
      <rect x="6" y="11" width="4" height="4" rx="0.5"
        stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  )
}

export function BuildingIcon({ className = '', ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} {...p}>
      <line x1="8" y1="1.5" x2="8" y2="5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <rect x="3" y="5" width="10" height="10" rx="1"
        stroke="currentColor" strokeWidth="1.4"/>
      <line x1="3" y1="5" x2="13" y2="5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <rect x="5"   y="7"  width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.55"/>
      <rect x="8.5" y="7"  width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.55"/>
      <rect x="5"   y="11" width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.55"/>
      <rect x="8.5" y="11" width="2.5" height="2.5" rx="0.4" fill="currentColor" opacity="0.55"/>
    </svg>
  )
}

export function MixedIcon({ className = '', ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} {...p}>
      <polyline points="1,9 7,2 13,9"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity="0.7"/>
      <rect x="3" y="9" width="8" height="6" rx="1"
        stroke="currentColor" strokeWidth="1.3" opacity="0.7"/>
      <line x1="13.5" y1="2" x2="13.5" y2="14"
        stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.35"/>
      <line x1="18" y1="0.5" x2="18" y2="4"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <rect x="14.5" y="4" width="7" height="11" rx="0.8"
        stroke="currentColor" strokeWidth="1.3"/>
      <rect x="16"   y="6"  width="1.8" height="1.8" rx="0.3" fill="currentColor" opacity="0.5"/>
      <rect x="18.5" y="6"  width="1.8" height="1.8" rx="0.3" fill="currentColor" opacity="0.5"/>
      <rect x="16"   y="10" width="1.8" height="1.8" rx="0.3" fill="currentColor" opacity="0.5"/>
      <rect x="18.5" y="10" width="1.8" height="1.8" rx="0.3" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}

export function CalendarAlertIcon({ className = '', ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} {...p}>
      <rect x="1" y="3" width="14" height="12" rx="2"
        stroke="currentColor" strokeWidth="1.4"/>
      <line x1="1" y1="7" x2="15" y2="7"
        stroke="currentColor" strokeWidth="1.2"/>
      <line x1="5"  y1="1" x2="5"  y2="4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="11" y1="1" x2="11" y2="4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="8" y1="9.5" x2="8" y2="12.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="14" r="0.9" fill="currentColor"/>
    </svg>
  )
}

// ─── Pill badges ────────────────────────────────────────────────────

type TagSize = 'sm' | 'lg'

export function ResidentialTag({ size = 'sm', className = '' }: { size?: TagSize; className?: string }) {
  if (size === 'lg') return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${className}`}>
      <HouseIcon className="w-3.5 h-3.5 text-sky-600" />
      Residential
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-[3px] text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${className}`}>
      <HouseIcon className="w-2.5 h-2.5 text-sky-600" />
      RES
    </span>
  )
}

export function CommercialTag({ size = 'sm', className = '' }: { size?: TagSize; className?: string }) {
  if (size === 'lg') return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20 ${className}`}>
      <BuildingIcon className="w-3.5 h-3.5 text-[#1B3B6F]" />
      Commercial
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-[3px] text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20 ${className}`}>
      <BuildingIcon className="w-2.5 h-2.5 text-[#1B3B6F]" />
      COM
    </span>
  )
}

/** Auto-switches between Residential / Commercial based on building_type string */
export function PortfolioTag({
  buildingType, size = 'sm', className = '',
}: { buildingType?: string | null; size?: TagSize; className?: string }) {
  return buildingType === 'commercial'
    ? <CommercialTag size={size} className={className} />
    : <ResidentialTag size={size} className={className} />
}

// ─── Segmented portfolio filter control ─────────────────────────────

export type PortfolioValue = 'all' | 'residential' | 'commercial'

interface PortfolioFilterProps {
  value: PortfolioValue
  onChange: (v: PortfolioValue) => void
  counts?: { all?: number; residential?: number; commercial?: number }
  className?: string
}

export function PortfolioFilter({ value, onChange, counts = {}, className = '' }: PortfolioFilterProps) {
  const opts: { v: PortfolioValue; icon: React.ReactNode; label: string }[] = [
    { v: 'all',         icon: <MixedIcon    className="w-[18px] h-[14px]" />, label: 'All' },
    { v: 'residential', icon: <HouseIcon    className="w-3.5 h-3.5" />,       label: 'Residential' },
    { v: 'commercial',  icon: <BuildingIcon className="w-3.5 h-3.5" />,       label: 'Commercial' },
  ]

  const activeColor: Record<PortfolioValue, string> = {
    all:         'text-slate-800',
    residential: 'text-sky-700',
    commercial:  'text-[#1B3B6F]',
  }
  const iconColor: Record<PortfolioValue, string> = {
    all:         'text-slate-500',
    residential: 'text-sky-600',
    commercial:  'text-[#1B3B6F]',
  }

  return (
    <div className={`flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5 ${className}`}>
      {opts.map(opt => {
        const active = value === opt.v
        const count  = counts[opt.v]
        return (
          <button key={opt.v} onClick={() => onChange(opt.v)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              transition-all select-none
              ${active
                ? `bg-white shadow-sm ${activeColor[opt.v]}`
                : 'text-slate-500 hover:text-slate-700'}
            `}>
            <span className={active ? iconColor[opt.v] : 'text-slate-400'}>
              {opt.icon}
            </span>
            {opt.label}
            {count !== undefined && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/60 text-slate-400'
              }`}>{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

