'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus, Home, FileText, ArrowRight } from 'lucide-react'

const actions = [
  {
    label: 'Add Tenant',
    description: 'Onboard a new resident',
    icon: UserPlus,
    href: '/tenants?action=new',
    accent: 'from-teal-500 to-teal-600',
    glow: 'hover:shadow-teal-500/20',
    iconBg: 'bg-teal-500/15 group-hover:bg-teal-500/20',
    iconColor: 'text-teal-600',
    shimmerColor: 'from-teal-400/0 via-teal-400/10 to-teal-400/0',
  },
  {
    label: 'Add Unit',
    description: 'Register a new space',
    icon: Home,
    href: '/buildings?action=new-unit',
    accent: 'from-[#1B3B6F] to-[#2a4f8f]',
    glow: 'hover:shadow-[#1B3B6F]/20',
    iconBg: 'bg-[#1B3B6F]/8 group-hover:bg-[#1B3B6F]/12',
    iconColor: 'text-[#1B3B6F]',
    shimmerColor: 'from-[#1B3B6F]/0 via-[#1B3B6F]/8 to-[#1B3B6F]/0',
  },
  {
    label: 'Create Lease',
    description: 'Draft a new agreement',
    icon: FileText,
    href: '/leases?action=new',
    accent: 'from-violet-500 to-violet-600',
    glow: 'hover:shadow-violet-500/20',
    iconBg: 'bg-violet-500/8 group-hover:bg-violet-500/12',
    iconColor: 'text-violet-600',
    shimmerColor: 'from-violet-400/0 via-violet-400/8 to-violet-400/0',
  },
]

export default function QuickActions() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</p>
        <h3 className="text-base font-semibold text-slate-900 mt-0.5">Quick Actions</h3>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mx-5" />

      {/* Action buttons */}
      <div className="p-3 space-y-1.5">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => router.push(action.href)}
            className={`
              group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl
              border border-slate-100 bg-slate-50/50
              hover:bg-white hover:border-slate-200 hover:shadow-lg ${action.glow}
              transition-all duration-200 overflow-hidden text-left
            `}
          >
            {/* Shimmer sweep on hover */}
            <div className={`
              absolute inset-0 -translate-x-full group-hover:translate-x-full
              bg-gradient-to-r ${action.shimmerColor}
              transition-transform duration-700 ease-in-out
            `} />

            {/* Icon */}
            <div className={`
              relative z-10 flex items-center justify-center w-9 h-9 rounded-xl shrink-0
              transition-all duration-200 ${action.iconBg}
            `}>
              <action.icon className={`h-4 w-4 ${action.iconColor} transition-transform duration-200 group-hover:scale-110`} />
            </div>

            {/* Text */}
            <div className="relative z-10 flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{action.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{action.description}</p>
            </div>

            {/* Arrow */}
            <ArrowRight className={`
              relative z-10 h-4 w-4 text-slate-300 shrink-0
              group-hover:text-slate-500 group-hover:translate-x-0.5
              transition-all duration-200
            `} />
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
