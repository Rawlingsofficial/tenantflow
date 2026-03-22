'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Search, X, FileText,
  Users, Home, LogOut, Settings,
  User, ChevronDown, CheckCircle2, Sparkles
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'
import OrgSwitcher from './OrgSwitcher'
import { useOrgStore } from '@/store/orgStore'

interface SearchResult {
  type: 'tenant' | 'unit' | 'lease'
  id: string
  title: string
  subtitle: string
  href: string
}

// ── Org loader ────────────────────────────────────────────────
function OrgLoader({ orgId }: { orgId: string }) {
  const supabase = getSupabaseBrowserClient()
  const { setCurrentOrg } = useOrgStore()

  useEffect(() => {
    if (!orgId) return
    ;(supabase as any)
      .from('organizations')
      .select('id, name, property_type')
      .eq('id', orgId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data) setCurrentOrg({ id: data.id, name: data.name, property_type: data.property_type })
      })
  }, [orgId])

  return null
}

// ── Dropdown container shared animation ──────────────────────
const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
  exit:    { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.15 } },
}

// ── Global Search ─────────────────────────────────────────────
function GlobalSearch({ orgId }: { orgId: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const timeout = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  async function doSearch(q: string) {
    setLoading(true)
    const term = `%${q}%`
    const found: SearchResult[] = []
    const db = supabase as any

    const { data: tenants } = await db
      .from('tenants')
      .select('id, first_name, last_name, primary_phone, email, occupation, company_name, tenant_type')
      .eq('organization_id', orgId)
      .or(`first_name.ilike.${term},last_name.ilike.${term},primary_phone.ilike.${term},email.ilike.${term},company_name.ilike.${term}`)
      .limit(5)

    ;(tenants ?? []).forEach((t: any) => {
      const isCompany = t.tenant_type === 'company'
      const name = isCompany
        ? (t.company_name ?? 'Unknown Company')
        : `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'
      found.push({
        type: 'tenant', id: t.id,
        title: name,
        subtitle: isCompany ? 'Company' : (t.occupation ?? t.email ?? t.primary_phone ?? 'Tenant'),
        href: `/tenants/${t.id}`,
      })
    })

    const { data: buildings } = await db.from('buildings').select('id').eq('organization_id', orgId)
    const bIds = (buildings ?? []).map((b: any) => b.id)
    if (bIds.length > 0) {
      const { data: units } = await db
        .from('units')
        .select('id, unit_code, status, building_id, buildings(name)')
        .in('building_id', bIds)
        .ilike('unit_code', term)
        .limit(3)
      ;(units ?? []).forEach((u: any) => {
        found.push({
          type: 'unit', id: u.id,
          title: `Unit ${u.unit_code}`,
          subtitle: `${u.buildings?.name ?? ''} · ${u.status}`,
          href: '/buildings',
        })
      })
    }

    setResults(found)
    setLoading(false)
  }

  const typeConfig: Record<string, { color: string; icon: any }> = {
    tenant: { color: 'bg-blue-50 text-blue-600 border border-blue-100', icon: Users },
    unit:   { color: 'bg-teal-50 text-teal-600 border border-teal-100', icon: Home },
    lease:  { color: 'bg-violet-50 text-violet-600 border border-violet-100', icon: FileText },
  }

  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Input */}
      <div className={`
        relative flex items-center h-9 rounded-xl transition-all duration-200
        ${focused
          ? 'ring-2 ring-teal-400/30 shadow-sm shadow-teal-400/10'
          : 'ring-1 ring-slate-200'
        }
        bg-white
      `}>
        <Search className={`absolute left-3 h-3.5 w-3.5 transition-colors duration-200 ${focused ? 'text-teal-500' : 'text-slate-400'}`} />
        <input
          ref={inputRef}
          placeholder="Search…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
          className="w-full pl-8 pr-20 h-full text-sm bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
        />
        {/* Kbd hint */}
        {!query && (
          <div className="absolute right-3 flex items-center gap-0.5 pointer-events-none">
            <kbd className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">⌘K</kbd>
          </div>
        )}
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
          >
            {loading ? (
              <div className="px-4 py-6 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <div className="h-3.5 w-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  Searching…
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No results for <span className="font-medium text-slate-600">"{query}"</span>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, i) => {
                  const { color, icon: Icon } = typeConfig[result.type]
                  return (
                    <motion.button
                      key={`${result.type}-${result.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left group transition-colors"
                      onClick={() => { setOpen(false); setQuery(''); setResults([]); router.push(result.href) }}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate group-hover:text-teal-700 transition-colors">{result.title}</p>
                        <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                      </div>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide ${color}`}>
                        {result.type}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Notifications bell ────────────────────────────────────────
function NotificationsBell({ orgId }: { orgId: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [expiringLeases, setExpiringLeases] = useState<any[]>([])
  const [vacantCount, setVacantCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (orgId) loadNotifications() }, [orgId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadNotifications() {
    const db = supabase as any
    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: expiring } = await db
      .from('leases')
      .select('id, lease_end, tenants(first_name, last_name, company_name, tenant_type), units(unit_code)')
      .eq('organization_id', orgId).eq('status', 'active')
      .gte('lease_end', today).lte('lease_end', in30).order('lease_end')
    setExpiringLeases(expiring ?? [])

    const { data: buildings } = await db.from('buildings').select('id').eq('organization_id', orgId)
    const bIds = (buildings ?? []).map((b: any) => b.id)
    if (bIds.length > 0) {
      const { data: units } = await db.from('units').select('id').in('building_id', bIds).eq('status', 'vacant')
      setVacantCount((units ?? []).length)
    }
  }

  const totalCount = expiringLeases.length + (vacantCount > 0 ? 1 : 0)

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative p-2 rounded-xl transition-colors
          ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
        `}
      >
        <Bell className="h-[18px] w-[18px]" />
        <AnimatePresence>
          {totalCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-sm"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
              </div>
              {totalCount > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {totalCount} alert{totalCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {totalCount === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-0.5">No alerts right now</p>
                </div>
              ) : (
                <div className="py-2">
                  {vacantCount > 0 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => { setOpen(false); router.push('/buildings') }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-50/50 text-left transition-colors group"
                    >
                      <div className="p-1.5 bg-amber-100 rounded-lg shrink-0 mt-0.5">
                        <Home className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 group-hover:text-amber-700 transition-colors">
                          {vacantCount} vacant unit{vacantCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Consider assigning tenants</p>
                      </div>
                    </motion.button>
                  )}

                  {expiringLeases.map((lease: any, i: number) => {
                    const t = lease.tenants
                    const name = t?.tenant_type === 'company'
                      ? (t.company_name ?? 'Company')
                      : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                    const days = differenceInDays(new Date(lease.lease_end), new Date())
                    const urgent = days <= 7
                    return (
                      <motion.button
                        key={lease.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => { setOpen(false); router.push('/leases') }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left border-t border-slate-50 transition-colors group ${
                          urgent ? 'hover:bg-red-50/50' : 'hover:bg-amber-50/30'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${urgent ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <FileText className={`h-3.5 w-3.5 ${urgent ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{name} — Unit {lease.units?.unit_code}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Expires in{' '}
                            <span className={`font-semibold ${urgent ? 'text-red-500' : 'text-amber-600'}`}>{days}d</span>
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => { setOpen(false); router.push('/dashboard') }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                View dashboard →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── User menu ─────────────────────────────────────────────────
function UserMenu() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all
          ${open ? 'bg-slate-100' : 'hover:bg-slate-100'}
        `}
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
          <AvatarFallback className="bg-gradient-to-br from-[#1B3B6F] to-[#14b8a6] text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-[13px] font-semibold text-slate-800 leading-tight">{user?.fullName ?? 'Account'}</p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 overflow-hidden"
          >
            {/* Profile header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-[#1B3B6F] to-[#14b8a6] text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName ?? 'Account'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress ?? ''}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {[
                { icon: User, label: 'Edit profile', action: () => { setOpen(false); openUserProfile() } },
                { icon: Settings, label: 'Settings', action: () => { setOpen(false); router.push('/settings') } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left transition-colors group"
                >
                  <item.icon className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 py-1.5">
              <button
                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left transition-colors group"
              >
                <LogOut className="h-4 w-4 group-hover:text-red-600 transition-colors" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main TopNav ───────────────────────────────────────────────
export default function TopNav() {
  const { orgId } = useAuth()

  return (
    <header className="
      h-16 shrink-0 flex items-center px-6 gap-4
      bg-white/90 backdrop-blur-md
      border-b border-slate-200/80
      sticky top-0 z-40
    ">
      {orgId && <OrgLoader orgId={orgId} />}

      {/* Org switcher */}
      <OrgSwitcher />

      {/* Divider */}
      <div className="h-6 w-px bg-slate-200 shrink-0" />

      {/* Search */}
      {orgId && <GlobalSearch orgId={orgId} />}

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {orgId && <NotificationsBell orgId={orgId} />}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

        <UserMenu />
      </div>
    </header>
  )
}
