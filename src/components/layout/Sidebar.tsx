'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, FileText, User,
  Receipt, BarChart3, Settings, CreditCard,
  ChevronRight, Globe, Wrench, MessageSquare,
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'

import { cn } from '@/lib/utils'

const RESIDENTIAL_NAV = [
  { label: 'Dashboard',         href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Buildings & Units', href: '/buildings',    icon: Building2 },
  { label: 'Tenants',           href: '/tenants',      icon: Users },
  { label: 'Leases',            href: '/leases',       icon: FileText },
  { label: 'Leads',             href: '/leads',        icon: User },
  { label: 'Payments',          href: '/payments',     icon: CreditCard },
  { label: 'Listings',          href: '/listings',     icon: Globe },
  { label: 'Maintenance',       href: '/maintenance',  icon: Wrench },
  { label: 'Notifications',     href: '/notifications', icon: MessageSquare },
  { label: 'Reports',           href: '/reports',      icon: BarChart3 },
  { label: 'Settings',          href: '/settings',     icon: Settings },
]

const COMMERCIAL_NAV = [
  { label: 'Dashboard',          href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Buildings & Spaces', href: '/buildings',   icon: Building2 },
  { label: 'Companies',          href: '/companies',   icon: Users },
  { label: 'Leases',             href: '/leases',      icon: FileText },
  { label: 'Leads',              href: '/leads',       icon: User },
  { label: 'Invoices',           href: '/invoices',    icon: Receipt },
  { label: 'Listings',           href: '/listings',    icon: Globe },
  { label: 'Maintenance',        href: '/maintenance', icon: Wrench },
  { label: 'Notifications',      href: '/notifications', icon: MessageSquare },
  { label: 'Reports',            href: '/reports',     icon: BarChart3 },
  { label: 'Settings',           href: '/settings',    icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06] flex-shrink-0">
      <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-900/40 flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
          <path d="M3 11L12 3L21 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9.5V19H19V9.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="13" width="6" height="6" rx="1" fill="white" opacity="0.85" />
        </svg>
      </div>
      <div className="flex items-baseline leading-none">
        <span className="text-white font-bold text-[16px] tracking-tight">Tenant</span>
        <span className="text-teal-400 font-bold text-[16px] tracking-tight">Flow</span>
      </div>
    </div>
  )
}

function NavItem({ item, active }: { item: typeof RESIDENTIAL_NAV[0]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group',
        active ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-teal-400 rounded-r-full" />
      )}
      <span className={cn(
        'flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-colors duration-150',
        active ? 'bg-teal-500/15 text-teal-400' : 'text-gray-600 group-hover:text-gray-400 group-hover:bg-white/[0.05]'
      )}>
        <item.icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 leading-none">{item.label}</span>
      {active && <ChevronRight className="h-3 w-3 text-gray-600 flex-shrink-0" />}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { propertyType, loading } = usePropertyType()

  const isCommercial = propertyType === 'commercial'
  const nav = isCommercial ? COMMERCIAL_NAV : RESIDENTIAL_NAV

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="relative w-[220px] h-screen flex flex-col flex-shrink-0 bg-[#0d1117] border-r border-white/[0.06]">
      <div className="absolute top-0 left-0 w-32 h-32 bg-teal-500/[0.08] rounded-full blur-3xl pointer-events-none" />

      <Logo />

      <div className="px-4 pt-5 pb-1.5">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-700 uppercase">Menu</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
        {nav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="px-3 pb-4">
        <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <p className="text-[10px] text-gray-700">TenantFlow</p>
          <span className="text-[10px] font-semibold font-mono bg-white/[0.06] text-gray-500 px-1.5 py-0.5 rounded-md">v1.0</span>
        </div>
      </div>
    </aside>
  )
}
