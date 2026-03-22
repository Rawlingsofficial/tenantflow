'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Users, FileText,
  Receipt, BarChart3, Settings, CreditCard,
  ChevronRight, Home, Briefcase
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useMixedModeStore } from '@/store/mixedModeStore'
import OrgSwitcher from './OrgSwitcher'

// ── Nav definitions ───────────────────────────────────────────
const RESIDENTIAL_NAV = [
  { label: 'Dashboard',         href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Buildings & Units', href: '/buildings',    icon: Building2 },
  { label: 'Tenants',           href: '/tenants',      icon: Users },
  { label: 'Leases',            href: '/leases',       icon: FileText },
  { label: 'Payments',          href: '/payments',     icon: CreditCard },
  { label: 'Reports',           href: '/reports',      icon: BarChart3 },
  { label: 'Settings',          href: '/settings',     icon: Settings },
]

const COMMERCIAL_NAV = [
  { label: 'Dashboard',          href: '/dashboard',          icon: LayoutDashboard },
  { label: 'Buildings & Spaces', href: '/buildings',          icon: Building2 },
  { label: 'Companies',          href: '/companies',          icon: Users },
  { label: 'Leases',             href: '/leases',             icon: FileText },
  { label: 'Invoices',           href: '/invoices',           icon: Receipt },
  { label: 'Reports',            href: '/commercial/reports', icon: BarChart3 },
  { label: 'Settings',           href: '/settings',           icon: Settings },
]

// ── Nav item ──────────────────────────────────────────────────
function NavItem({
  item,
  active,
  index,
}: {
  item: typeof RESIDENTIAL_NAV[0]
  active: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.045, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={item.href}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-200 group overflow-hidden
          ${active
            ? 'text-teal-700 bg-teal-50/80'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
          }
        `}
      >
        {/* Active background glow */}
        {active && (
          <motion.div
            layoutId="nav-active-bg"
            className="absolute inset-0 bg-gradient-to-r from-teal-50 to-teal-100/50 rounded-xl"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}

        {/* Left accent bar */}
        {active && (
          <motion.div
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-teal-400 to-teal-600 rounded-full"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}

        {/* Icon */}
        <span className={`
          relative z-10 flex items-center justify-center w-7 h-7 rounded-lg shrink-0
          transition-all duration-200
          ${active
            ? 'bg-teal-500/10 text-teal-600'
            : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-200/60'
          }
        `}>
          <item.icon className="h-4 w-4" />
        </span>

        {/* Label */}
        <span className="relative z-10 flex-1 leading-none">{item.label}</span>

        {/* Chevron */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="relative z-10"
            >
              <ChevronRight className="h-3.5 w-3.5 text-teal-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/40 to-transparent rounded-xl" />
        </div>
      </Link>
    </motion.div>
  )
}

// ── Logo ──────────────────────────────────────────────────────
function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="px-5 py-5 flex items-center gap-3 border-b border-slate-100/80"
    >
      {/* Icon mark */}
      <div className="relative h-9 w-9 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-[#1B3B6F]/10 rounded-xl blur-sm" />
        <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-sm">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
            <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
            <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      <div className="flex items-baseline gap-0">
        <span className="text-[#1B3B6F] font-bold text-[17px] leading-none tracking-tight">Tenant</span>
        <span className="text-[#14b8a6] font-bold text-[17px] leading-none tracking-tight">Flow</span>
      </div>
    </motion.div>
  )
}

// ── Mode toggle (mixed portfolio) ─────────────────────────────
function ModeToggle({
  mode,
  onSet,
}: {
  mode: 'residential' | 'commercial'
  onSet: (m: 'residential' | 'commercial') => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="px-3 pt-2 pb-1"
    >
      <div className="relative flex items-center bg-slate-100 rounded-xl p-1 gap-1">
        {/* Sliding pill */}
        <motion.div
          layout
          layoutId="mode-pill"
          className="absolute top-1 bottom-1 w-[calc(50%-2px)] bg-white rounded-[10px] shadow-sm"
          style={{ left: mode === 'residential' ? '4px' : 'calc(50% + 2px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
        <button
          onClick={() => onSet('residential')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-colors duration-200 ${
            mode === 'residential' ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="h-3 w-3" /> Residential
        </button>
        <button
          onClick={() => onSet('commercial')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-colors duration-200 ${
            mode === 'commercial' ? 'text-[#1B3B6F]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Briefcase className="h-3 w-3" /> Commercial
        </button>
      </div>
    </motion.div>
  )
}

// ── Portfolio badge ───────────────────────────────────────────
function PortfolioBadge({ isCommercial }: { isCommercial: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.12 }}
      className="px-4 pt-2 pb-1"
    >
      <div className={`
        inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider
        ${isCommercial
          ? 'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/15'
          : 'bg-teal-50 text-teal-700 border border-teal-200/60'
        }
      `}>
        <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: isCommercial ? '#1B3B6F' : '#14b8a6' }}
        />
        {isCommercial ? 'Commercial' : 'Residential'}
      </div>
    </motion.div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname()
  const { type, loading } = usePropertyType()
  const { mode, setMode } = useMixedModeStore()

  const isMixed      = type === 'mixed'
  const isCommercial = type === 'commercial' || (isMixed && mode === 'commercial')
  const nav          = isCommercial ? COMMERCIAL_NAV : RESIDENTIAL_NAV

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="
      relative w-60 h-screen flex flex-col shrink-0
      bg-white border-r border-slate-100
      before:absolute before:inset-y-0 before:right-0 before:w-px
      before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent
      before:pointer-events-none
    ">
      {/* Subtle top-left glow for depth */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-teal-400/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      {/* Logo */}
      <Logo />

      {/* Org switcher */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="px-3 pt-3 pb-1"
      >
        <OrgSwitcher />
      </motion.div>

      {/* Mixed mode toggle */}
      <AnimatePresence>
        {!loading && isMixed && (
          <ModeToggle mode={mode} onSet={setMode} />
        )}
      </AnimatePresence>

      {/* Portfolio badge */}
      <AnimatePresence>
        {!loading && !isMixed && (
          <PortfolioBadge isCommercial={isCommercial} />
        )}
      </AnimatePresence>

      {/* Section label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Navigation</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {nav.map((item, i) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} index={i} />
        ))}
      </nav>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-4 py-4 border-t border-slate-50"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-300 font-medium">TenantFlow</p>
          <span className="text-[10px] text-slate-300 font-mono bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
            v1.0
          </span>
        </div>
      </motion.div>
    </aside>
  )
}
