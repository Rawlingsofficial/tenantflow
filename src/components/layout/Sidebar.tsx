'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  LayoutDashboard, Building2, Users, FileText,
  CreditCard, BarChart3, Settings, Zap,
  ChevronDown, HelpCircle, Plus
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Buildings & Units', href: '/buildings', icon: Building2 },
  { label: 'Tenants', href: '/tenants', icon: Users },
  { label: 'Leases', href: '/leases', icon: FileText },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Billing', href: '/billing', icon: Zap },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const [settingsOpen, setSettingsOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <aside className="flex flex-col h-screen w-[200px] bg-white border-r border-slate-200 shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-slate-100">
        <div className="relative h-8 w-8 shrink-0">
          {/* TenantFlow logo mark — house shape with T */}
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* House outline */}
            <path d="M3 15L16 4L29 15" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 13V27H26V13" stroke="#1B3B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* T letter */}
            <rect x="10" y="16" width="12" height="2.5" rx="1" fill="#1B3B6F"/>
            <rect x="14.5" y="16" width="3" height="10" rx="1" fill="#1B3B6F"/>
            {/* Teal chimney accent */}
            <rect x="20" y="4" width="3.5" height="6" rx="1" fill="#14b8a6"/>
          </svg>
        </div>
        <div className="flex items-baseline gap-0">
          <span className="text-[#1B3B6F] font-bold text-lg leading-none tracking-tight">Tenant</span>
          <span className="text-[#14b8a6] font-bold text-lg leading-none tracking-tight">Flow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                active
                  ? 'bg-slate-100 text-[#1B3B6F] font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}
            >
              <item.icon
                style={{ height: '16px', width: '16px' }}
                className={`shrink-0 ${active ? 'text-[#1B3B6F]' : 'text-slate-400'}`}
              />
              {item.label}
              {/* Payments badge from screenshot */}
              {item.href === '/payments' && (
                <span className="ml-auto text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">
                  10%
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        {/* New Siret / Help button — like in screenshot */}
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14b8a6]/10 text-[#0f9488] text-sm font-medium hover:bg-[#14b8a6]/20 transition-colors">
          <HelpCircle style={{ height: '15px', width: '15px' }} />
          New Siret
        </button>

        {/* User */}
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
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

        {/* Settings expand */}
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings style={{ height: '14px', width: '14px' }} />
          Settings
          <ChevronDown
            style={{ height: '12px', width: '12px' }}
            className={`ml-auto transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </aside>
  )
}

