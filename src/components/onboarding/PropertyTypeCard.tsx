'use client'

import { Check, LucideIcon } from 'lucide-react'

interface PropertyTypeCardProps {
  type: 'residential' | 'commercial'  // mixed removed
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  examples: string[]
  tenantLabel: string
  unitLabel: string
  paymentLabel: string
  color: string
  bg: string
  border: string
  check: string
  selected: boolean
  onSelect: () => void
}

export function PropertyTypeCard({
  icon: Icon,
  title,
  subtitle,
  description,
  examples,
  tenantLabel,
  unitLabel,
  paymentLabel,
  color,
  bg,
  border,
  check,
  selected,
  onSelect,
}: PropertyTypeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        selected
          ? `${border} ${bg}`
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="p-5 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? 'bg-white/80' : 'bg-slate-100'
        }`}>
          <Icon className={`h-6 w-6 ${selected ? color : 'text-slate-400'}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <p className={`text-base font-bold ${selected ? color : 'text-slate-900'}`}>
              {title}
            </p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <p className="text-sm text-slate-500">{description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {examples.map(ex => (
              <span
                key={ex}
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                  selected
                    ? `${bg} ${color} border-current/20`
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {ex}
              </span>
            ))}
          </div>
        </div>

        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
          selected ? `${check} border-transparent` : 'border-slate-200'
        }`}>
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>

      {selected && (
        <div className="px-5 pb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Tenants',  value: tenantLabel  },
            { label: 'Units',    value: unitLabel     },
            { label: 'Payments', value: paymentLabel  },
          ].map(row => (
            <div key={row.label} className="bg-white/80 rounded-xl p-2.5 border border-white">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {row.label}
              </p>
              <p className={`text-xs font-semibold ${color} leading-tight`}>{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
