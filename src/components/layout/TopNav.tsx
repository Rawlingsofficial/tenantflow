'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import {
  Bell, Search, X, FileText,
  Users, Home, LogOut, Settings,
  User, ChevronDown, CheckCircle2,
  Building2, ShieldCheck, Globe, Languages,
  UserCircle
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useOrgStore } from '@/store/orgStore'
import { usePropertyType } from '@/hooks/usePropertyType'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPageTitle(pathname: string, t: any): string {
  if (pathname.startsWith('/dashboard')) return t.nav.dashboard
  if (pathname.startsWith('/buildings')) return t.nav.buildings_units
  if (pathname.startsWith('/tenants')) return t.nav.tenants
  if (pathname.startsWith('/companies')) return t.nav.companies
  if (pathname.startsWith('/leases')) return t.nav.leases
  if (pathname.startsWith('/leads')) return t.nav.leads
  if (pathname.startsWith('/payments')) return t.nav.payments
  if (pathname.startsWith('/invoices')) return t.nav.invoices
  if (pathname.startsWith('/listings')) return t.nav.listings
  if (pathname.startsWith('/maintenance')) return t.nav.maintenance
  if (pathname.startsWith('/notifications')) return t.nav.notifications
  if (pathname.startsWith('/reports')) return t.nav.reports
  if (pathname.startsWith('/settings')) return t.nav.settings
  return 'TenantFlow'
}

export default function TopNav() {
  const { orgId } = useAuth()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const pathname = usePathname()
  const router = useRouter()
  const { currentOrg, userRole } = useOrgStore()
  const { propertyType } = usePropertyType()
  const { t, language, setLanguage } = useTranslation()
  
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) return null

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const pageTitle = getPageTitle(pathname, t)

  return (
    <header className="h-16 flex-shrink-0 flex items-center px-8 gap-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      {/* Left Side: Title & Org Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <h1 className="text-lg font-bold text-slate-900 truncate">
          {pageTitle}
        </h1>
        
        {currentOrg && (
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
            <span className="text-sm font-semibold text-slate-600 truncate">{currentOrg.name}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
              propertyType === 'commercial' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-teal-50 text-teal-700 border border-teal-100"
            )}>
              {propertyType}
            </span>
          </div>
        )}
      </div>

      {/* Right Side: Utils & Profile */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl mr-2">
          <button 
            onClick={() => setLanguage('en')}
            className={cn(
              "px-3 py-1 text-[11px] font-bold rounded-lg transition-all",
              language === 'en' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            EN
          </button>
          <button 
            onClick={() => setLanguage('fr')}
            className={cn(
              "px-3 py-1 text-[11px] font-bold rounded-lg transition-all",
              language === 'fr' ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            FR
          </button>
        </div>

        {/* Notifications */}
        <button 
          onClick={() => router.push('/notifications')}
          className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-2" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all",
              userMenuOpen ? "bg-slate-100" : "hover:bg-slate-50"
            )}
          >
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-teal-600 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              
              <div className="py-1">
                <button 
                  onClick={() => { setUserMenuOpen(false); openUserProfile() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                >
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  {t.topnav.profile}
                </button>
                <button 
                  onClick={() => { setUserMenuOpen(false); router.push('/settings') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  {t.nav.settings}
                </button>
              </div>

              <div className="h-px bg-slate-50 my-1" />
              
              <div className="py-1">
                <button 
                  onClick={() => signOut({ redirectUrl: '/sign-in' })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  {t.settings.sign_out}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
