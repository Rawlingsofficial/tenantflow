'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, FileText, User,
  Receipt, BarChart3, Settings, CreditCard,
  ChevronRight, ChevronLeft, Globe, Wrench, MessageSquare,
  LogOut, UserCircle, ShieldCheck, CreditCard as BillingIcon,
  Languages, Menu, X, ChevronDown, Sparkles
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
import { motion, AnimatePresence } from 'framer-motion'

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
      { labelKey: 'authentication', href: '/authentication', icon: ShieldCheck },
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
      <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/20 flex-shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 relative z-10">
          <path d="M3 11L12 3L21 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9.5V19H19V9.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="13" width="6" height="6" rx="1" fill="white" opacity="0.85" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none animate-in fade-in duration-500">
          <div className="flex items-baseline">
            <span className="text-slate-900 font-black text-xl tracking-tighter">Tenant</span>
            <span className="text-teal-600 font-black text-xl tracking-tighter">Flow</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Management</p>
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
        'group flex items-center rounded-xl text-sm font-bold transition-all duration-200 mb-1 relative w-full',
        collapsed ? 'px-0 h-11 justify-center' : 'px-4 py-2.5',
        active 
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' 
          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
      )}
    >
      <item.icon className={cn(
        'h-5 w-5 transition-colors shrink-0',
        active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
      )} />
      {!collapsed && <span className="ml-3 flex-1 truncate">{label}</span>}
      {active && !collapsed && (
        <motion.div 
          layoutId="activePill"
          className="absolute right-2 w-1 h-4 bg-white/40 rounded-full" 
        />
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
          <TooltipContent side="right" className="font-bold text-xs uppercase tracking-widest bg-[#1B3B6F] text-white border-none px-3 py-2">
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['portfolio', 'operations', 'financials', 'marketing'])
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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(k => k !== groupKey) 
        : [...prev, groupKey]
    )
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
      isCollapsed ? "w-[84px]" : "w-[280px]"
    )}>
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-24 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-90"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <Logo collapsed={isCollapsed} />

      <div className={cn(
        "flex-1 overflow-y-auto py-4 space-y-2 scrollbar-hide",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {filteredNav.map((group, gIdx) => {
          const isExpanded = group.groupKey ? expandedGroups.includes(group.groupKey) : true
          const groupLabel = group.groupKey ? (t.groups as any)[group.groupKey] : null

          return (
            <div key={group.groupKey || gIdx} className="mb-2">
              {groupLabel && !isCollapsed ? (
                <button 
                  onClick={() => group.groupKey && toggleGroup(group.groupKey)}
                  className="w-full flex items-center justify-between px-4 py-2 mb-1 group transition-colors"
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600">
                    {groupLabel}
                  </span>
                  <ChevronDown className={cn("h-3 w-3 text-slate-300 transition-transform duration-300", !isExpanded && "-rotate-90")} />
                </button>
              ) : isCollapsed && group.groupKey && (
                <div className="h-px bg-slate-100 my-4 mx-2" />
              )}
              
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={group.groupKey ? { height: 0, opacity: 0 } : false}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer Info / Support */}
      {!isCollapsed && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-teal-500/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Enterprise Plan</p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">Scale your portfolio</p>
            </div>
          </div>
        </div>
      )}

      {/* User Section */}
      <div className={cn("p-4 border-t border-slate-100 bg-white sticky bottom-0", isCollapsed && "px-2 py-4")} ref={settingsRef}>
        <div className="relative">
          {isCollapsed ? (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger className="w-full flex justify-center h-12 rounded-2xl transition-all hover:bg-slate-50 text-slate-600 group">
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center transition-all group-hover:bg-teal-50",
                      showSettings && "bg-teal-600 text-white"
                    )}
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className={cn("h-5 w-5", showSettings ? "text-white" : "text-slate-400 group-hover:text-teal-600")} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white border-none">{t.nav.settings}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all border duration-200",
                showSettings 
                  ? "bg-[#1B3B6F] text-white border-[#1B3B6F] shadow-lg shadow-[#1B3B6F]/20" 
                  : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", showSettings ? "bg-white/10" : "bg-slate-100")}>
                <Settings className={cn("h-4 w-4", showSettings ? "text-white" : "text-slate-400")} />
              </div>
              <span className="flex-1 text-left text-sm font-black uppercase tracking-tighter">{t.nav.settings}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", showSettings ? "rotate-180 text-white" : "text-slate-300")} />
            </button>
          )}

          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute bottom-full mb-3 left-0 w-64 bg-white border border-slate-200 rounded-[24px] shadow-2xl shadow-slate-200/50 py-3 z-[60] overflow-hidden",
                  isCollapsed && "left-0"
                )}
              >
                <div className="px-5 py-2 mb-2 border-b border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.nav.settings}</p>
                </div>
                
                <div className="px-2 space-y-1">
                  <button onClick={() => { router.push('/settings?tab=account'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-all text-left">
                    <UserCircle className="h-4 w-4" /> {t.settings.account}
                  </button>
                  
                  <button onClick={() => { router.push('/settings?tab=organization'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-all text-left">
                    <ShieldCheck className="h-4 w-4" /> {t.settings.organization}
                  </button>
                  
                  <button onClick={() => { router.push('/billing'); setShowSettings(false); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-all text-left">
                    <BillingIcon className="h-4 w-4" /> {t.settings.billing}
                  </button>
                </div>

                <div className="h-px bg-slate-100 my-2 mx-4" />

                <div className="px-5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Languages className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{t.settings.language}</span>
                  </div>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    <button 
                      onClick={() => setLanguage('en')}
                      className={cn("px-2 py-1 text-[9px] font-black rounded-md transition-all", language === 'en' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setLanguage('fr')}
                      className={cn("px-2 py-1 text-[9px] font-black rounded-md transition-all", language === 'fr' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      FR
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-2 mx-4" />

                <div className="px-2">
                  <button 
                    onClick={() => signOut({ redirectUrl: '/sign-in' })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-left font-black uppercase tracking-tighter"
                  >
                    <LogOut className="h-4 w-4" /> {t.settings.sign_out}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!isCollapsed && <p className="mt-4 px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest animate-in fade-in duration-500">{t.common.version}</p>}
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
