'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, FileText, User,
  Receipt, BarChart3, Settings, CreditCard,
  ChevronRight, ChevronLeft, Globe, Wrench, MessageSquare,
  LogOut, UserCircle, ShieldCheck, CreditCard as BillingIcon,
  Languages, Menu, X
} from 'lucide-react'
import Link from 'next/link'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useRole } from '@/hooks/useRole'
import { hasPermission } from '@/lib/permissions'
import { useTranslation } from '@/lib/i18n'
import { useUIStore } from '@/store/uiStore'
import { useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem {
  labelKey: string
  href: string
  icon: any
  permission?: string
  propertyType?: 'residential' | 'commercial'
}

interface NavGroup {
  groupKey?: string
  items: NavItem[]
}

// ── Navigation Configuration ──────────────────────────────────────────────────

const NAV_CONFIG: NavGroup[] = [
  {
    items: [
      { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    groupKey: 'portfolio',
    items: [
      { labelKey: 'buildings_units', href: '/buildings', icon: Building2, propertyType: 'residential' },
      { labelKey: 'buildings_spaces', href: '/buildings', icon: Building2, propertyType: 'commercial' },
      { labelKey: 'tenants', href: '/tenants', icon: Users, propertyType: 'residential' },
      { labelKey: 'companies', href: '/companies', icon: Users, propertyType: 'commercial' },
      { labelKey: 'leases', href: '/leases', icon: FileText },
    ]
  },
  {
    groupKey: 'operations',
    items: [
      { labelKey: 'leads', href: '/leads', icon: User },
      { labelKey: 'maintenance', href: '/maintenance', icon: Wrench },
      { labelKey: 'listings', href: '/listings', icon: Globe },
    ]
  },
  {
    groupKey: 'financials',
    items: [
      { labelKey: 'payments', href: '/payments', icon: CreditCard, propertyType: 'residential' },
      { labelKey: 'invoices', href: '/invoices', icon: Receipt, propertyType: 'commercial' },
    ]
  },
  {
    groupKey: 'marketing',
    items: [
      { labelKey: 'reports', href: '/reports', icon: BarChart3, permission: 'reports.view' },
    ]
  }
]

// ── Components ─────────────────────────────────────────────────────────────────

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-6 h-20 flex-shrink-0 transition-all duration-300",
      collapsed && "px-4 justify-center"
    )}>
      <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/20 flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path d="M3 11L12 3L21 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9.5V19H19V9.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="13" width="6" height="6" rx="1" fill="white" opacity="0.85" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex items-baseline leading-none animate-in fade-in duration-500">
          <span className="text-slate-900 font-bold text-xl tracking-tight">Tenant</span>
          <span className="text-teal-600 font-bold text-xl tracking-tight">Flow</span>
        </div>
      )}
    </div>
  )
}

function SidebarNavItem({ item, active, label, collapsed, onClick }: { item: NavItem; active: boolean; label: string; collapsed: boolean; onClick?: () => void }) {
  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center rounded-xl text-sm font-medium transition-all duration-200 mb-0.5 relative w-full',
        collapsed ? 'px-0 h-11 justify-center' : 'px-4 py-2.5',
        active 
          ? 'bg-teal-50 text-teal-700 shadow-sm shadow-teal-600/5' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <item.icon className={cn(
        'h-5 w-5 transition-colors shrink-0',
        active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
      )} />
      {!collapsed && <span className="ml-3 flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>}
      {!collapsed && active && <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
      {collapsed && active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-600 rounded-r-full" />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger className="w-full flex justify-center px-2">
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-semibold">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { propertyType } = usePropertyType()
  const { role } = useRole()
  const { t, language, setLanguage } = useTranslation()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { signOut } = useClerk()
  
  const [mounted, setMounted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) return null

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const filteredNav = NAV_CONFIG.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.propertyType && item.propertyType !== propertyType) return false
      if (item.permission && role && !hasPermission(role, item.permission as any)) return false
      return true
    })
  })).filter(group => group.items.length > 0)

  const isCollapsed = sidebarCollapsed && !mobileOpen

  const SidebarContent = (
    <aside className={cn(
      "h-screen flex flex-col bg-white border-r border-slate-200 relative z-50 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[80px]" : "w-[260px]"
    )}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-24 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-600 hover:bg-slate-50 transition-all"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <Logo collapsed={isCollapsed} />

      <div className={cn(
        "flex-1 overflow-y-auto py-2 space-y-6 scrollbar-hide",
        isCollapsed ? "px-0" : "px-4"
      )}>
        {filteredNav.map((group, gIdx) => (
          <div key={group.groupKey || gIdx} className="space-y-1">
            {group.groupKey && !isCollapsed && (
              <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 animate-in fade-in duration-500">
                {(t.groups as any)[group.groupKey]}
              </p>
            )}
            {isCollapsed && group.groupKey && (
              <div className="h-px bg-slate-100 my-4 mx-4" />
            )}
            {group.items.map((item) => (
              <SidebarNavItem 
                key={item.labelKey} 
                item={item} 
                active={isActive(item.href)} 
                label={(t.nav as any)[item.labelKey]}
                collapsed={isCollapsed}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className={cn("p-4 border-t border-slate-100", isCollapsed && "px-2 py-4")} ref={settingsRef}>
        <div className="relative">
          {isCollapsed ? (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger className="w-full flex justify-center h-11 rounded-xl transition-all hover:bg-slate-50 text-slate-600">
                  <Settings className={cn("h-5 w-5 text-slate-400", showSettings && "text-slate-900")} onClick={() => setShowSettings(!showSettings)} />
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold">{t.nav.settings}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all",
                showSettings ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Settings className="h-5 w-5 text-slate-400" />
              <span className="flex-1 text-left animate-in fade-in duration-300">{t.nav.settings}</span>
              <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", showSettings && "rotate-90")} />
            </button>
          )}

          {showSettings && (
            <div className={cn(
              "absolute bottom-0 left-full ml-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 py-2 animate-in fade-in slide-in-from-left-2 duration-200 z-[60]",
              isCollapsed && "bottom-0"
            )}>
              <div className="px-4 py-2 mb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.nav.settings}</p>
              </div>
              
              <button onClick={() => { router.push('/settings?tab=account'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left">
                <UserCircle className="h-4 w-4 text-slate-400" /> {t.settings.account}
              </button>
              
              <button onClick={() => { router.push('/settings?tab=organization'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left">
                <ShieldCheck className="h-4 w-4 text-slate-400" /> {t.settings.organization}
              </button>
              
              <button onClick={() => { router.push('/billing'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left">
                <BillingIcon className="h-4 w-4 text-slate-400" /> {t.settings.billing}
              </button>

              <div className="h-px bg-slate-100 my-2 mx-2" />

              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Languages className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{t.settings.language}</span>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'en' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLanguage('fr')}
                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'fr' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    FR
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-2 mx-2" />

              <button 
                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
              >
                <LogOut className="h-4 w-4" /> {t.settings.sign_out}
              </button>
            </div>
          )}
        </div>
        {!isCollapsed && <p className="mt-4 px-4 text-[10px] font-medium text-slate-400 animate-in fade-in duration-500">{t.common.version}</p>}
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop Sidebar (Always Visible) */}
      <div className="hidden lg:flex shrink-0">
        {SidebarContent}
      </div>

      {/* Mobile Sidebar (Toggleable) */}
      <div className="lg:hidden">
        <button 
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative animate-in slide-in-from-left duration-300">
              {SidebarContent}
              <button 
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 -right-12 p-2 bg-white rounded-full shadow-lg text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
