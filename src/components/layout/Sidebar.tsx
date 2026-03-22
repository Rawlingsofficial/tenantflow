'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  LayoutDashboard, Building2, Users, FileText,
  CreditCard, BarChart3, Settings, Zap,
  ChevronDown, HelpCircle, Home, Briefcase,
  Receipt, Layers, Building
} from 'lucide-react'
import { usePropertyType } from '@/hooks/usePropertyType'

type MixedView = 'residential' | 'commercial'

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { isResidential, isCommercial, isMixed, loading } = usePropertyType()
  const [mixedView, setMixedView] = useState<MixedView>('residential')
  const [settingsOpen, setSettingsOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Determine which nav set to show
  const showResidential = isResidential || (isMixed && mixedView === 'residential')
  const showCommercial = isCommercial || (isMixed && mixedView === 'commercial')

  const residentialNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Buildings & Units', href: '/buildings', icon: Building2 },
    { label: 'Tenants', href: '/tenants', icon: Users },
    { label: 'Leases', href: '/leases', icon: FileText },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Billing', href: '/billing', icon: Zap },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const commercialNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Buildings', href: '/buildings', icon: Building2 },
    { label: 'Companies', href: '/companies', icon: Briefcase },
    { label: 'Leases', href: '/leases', icon: FileText },
    { label: 'Invoices', href: '/invoices', icon: Receipt },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Billing', href: '/billing', icon: Zap },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  const navItems = showCommercial ? commercialNav : residentialNav

  return (
    <aside className="flex flex-col h-screen w-[200px] bg-white border-r border-slate-200 shrink-0">

      {/* Logo — preserve exact existing branding */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-slate-100">
        <div className="relative h-8 w-8 shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
            <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
            <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#14b8a6"/>
          </svg>
        </div>
        <div className="flex items-baseline gap-0">
          <span className="text-[#1B3B6F] font-bold text-lg leading-none tracking-tight">Tenant</span>
          <span className="text-[#14b8a6] font-bold text-lg leading-none tracking-tight">Flow</span>
        </div>
      </div>

      {/* ── MIXED MODE: Residential ⇄ Commercial toggle ── */}
      {isMixed && !loading && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMixedView('residential')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                mixedView === 'residential'
                  ? 'bg-white text-[#1B3B6F] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Home className="h-3 w-3" />
              Residential
            </button>
            <button
              onClick={() => setMixedView('commercial')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                mixedView === 'commercial'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Building className="h-3 w-3" />
              Commercial
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                active
                  ? 'bg-slate-100 text-[#1B3B6F] font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}>
              <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#1B3B6F]' : 'text-slate-400'}`} />
              {item.label}
              {/* Payments badge — keep from existing */}
              {item.href === '/payments' && !showCommercial && (
                <span className="ml-auto text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">
                  10%
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Portfolio type indicator — only for non-loading state */}
      {!loading && isMixed && (
        <div className="px-3 pb-1">
          <div className="px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-violet-600" />
              <p className="text-[10px] font-bold text-violet-700">Mixed Portfolio</p>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Viewing: <span className="font-semibold text-slate-500">{mixedView}</span>
            </p>
          </div>
        </div>
      )}

      {/* User profile at bottom — preserve exactly */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14b8a6]/10 text-[#0f9488] text-sm font-medium hover:bg-[#14b8a6]/20 transition-colors">
          <HelpCircle className="h-[15px] w-[15px]" />
          Help & Support
        </button>

        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          onClick={() => setSettingsOpen(!settingsOpen)}>
          <div className="h-8 w-8 rounded-full bg-[#1B3B6F] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
              {user?.fullName ?? 'Account'}
            </p>
            <p className="text-xs text-slate-400 truncate leading-tight">
              {user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? ''}
            </p>
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
        </button>

        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          onClick={() => setSettingsOpen(!settingsOpen)}>
          <Settings className="h-[14px] w-[14px]" />
          Settings
          <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  )
}
