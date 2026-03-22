'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, FileText,
  Receipt, BarChart3, Settings, CreditCard,
  ChevronRight
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'
import OrgSwitcher from './OrgSwitcher'

// ── Residential nav ───────────────────────────────────────────
const RESIDENTIAL_NAV = [
  { label: 'Dashboard',         href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Buildings & Units', href: '/buildings',    icon: Building2 },
  { label: 'Tenants',           href: '/tenants',      icon: Users },
  { label: 'Leases',            href: '/leases',       icon: FileText },
  { label: 'Payments',          href: '/payments',     icon: CreditCard },
  { label: 'Reports',           href: '/reports',      icon: BarChart3 },
  { label: 'Settings',          href: '/settings',     icon: Settings },
]

// ── Commercial nav ────────────────────────────────────────────
const COMMERCIAL_NAV = [
  { label: 'Dashboard',         href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Buildings & Spaces',href: '/buildings',            icon: Building2 },
  { label: 'Companies',         href: '/companies',            icon: Users },
  { label: 'Leases',            href: '/leases',               icon: FileText },
  { label: 'Invoices',          href: '/invoices',             icon: Receipt },
  { label: 'Reports',           href: '/commercial/reports',   icon: BarChart3 },
  { label: 'Settings',          href: '/settings',             icon: Settings },
]

function NavItem({ item, active }: { item: typeof RESIDENTIAL_NAV[0]; active: boolean }) {
  return (
    <Link href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}>
      <item.icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { type, loading } = usePropertyType()

  const isCommercial = type === 'commercial'
  const nav = isCommercial ? COMMERCIAL_NAV : RESIDENTIAL_NAV

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-gray-50">
        <div className="relative h-8 w-8 shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
            <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
          </svg>
        </div>
        <div className="flex items-baseline">
          <span className="text-[#1B3B6F] font-bold text-lg leading-none tracking-tight">Tenant</span>
          <span className="text-[#14b8a6] font-bold text-lg leading-none tracking-tight">Flow</span>
        </div>
      </div>

      {/* Org switcher */}
      <div className="px-3 pt-3 pb-1">
        <OrgSwitcher />
      </div>

      {/* Portfolio type badge */}
      {!loading && (
        <div className="px-4 pt-2 pb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isCommercial
              ? 'bg-blue-100 text-blue-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {isCommercial ? '🏢 Commercial' : '🏠 Residential'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-50">
        <p className="text-[10px] text-gray-300 text-center">TenantFlow v1.0</p>
      </div>
    </aside>
  )
}
