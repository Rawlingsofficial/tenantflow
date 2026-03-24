'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import {
  Bell, Search, X, FileText,
  Users, Home, LogOut, Settings,
  User, ChevronDown, CheckCircle2,
  Building2, ShieldCheck, Globe,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'
import { useOrgStore } from '@/store/orgStore'
import { usePropertyType } from '@/hooks/usePropertyType'

interface SearchResult {
  type: 'tenant' | 'unit' | 'lease'
  id: string
  title: string
  subtitle: string
  href: string
}

// ── Global Search ─────────────────────────────────────────────
function GlobalSearch({ orgId }: { orgId: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const timeout = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(timeout)
  }, [query])

  async function doSearch(q: string) {
    setSearching(true)
    const term = `%${q}%`
    const found: SearchResult[] = []
    const db = supabase as any

    const { data: tenants } = await db
      .from('tenants')
      .select('id, first_name, last_name, primary_phone, email, occupation, company_name, tenant_type')
      .eq('organization_id', orgId)
      .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company_name.ilike.${term}`)
      .limit(5)

    ;(tenants ?? []).forEach((t: any) => {
      const isCompany = t.tenant_type === 'company'
      const name = isCompany ? (t.company_name ?? 'Company') : `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Tenant'
      found.push({ type: 'tenant', id: t.id, title: name, subtitle: isCompany ? 'Company' : (t.occupation ?? t.email ?? ''), href: `/tenants/${t.id}` })
    })

    const { data: buildings } = await db.from('buildings').select('id').eq('organization_id', orgId)
    const bIds = (buildings ?? []).map((b: any) => b.id)
    if (bIds.length) {
      const { data: units } = await db.from('units').select('id, unit_code, status, buildings(name)').in('building_id', bIds).ilike('unit_code', term).limit(3)
      ;(units ?? []).forEach((u: any) => {
        found.push({ type: 'unit', id: u.id, title: `Unit ${u.unit_code}`, subtitle: `${u.buildings?.name ?? ''} · ${u.status}`, href: '/buildings' })
      })
    }

    setResults(found)
    setSearching(false)
  }

  const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    tenant: Users, unit: Home, lease: FileText,
  }
  const typeColor: Record<string, string> = {
    tenant: 'text-sky-400 bg-sky-500/10',
    unit:   'text-teal-400 bg-teal-500/10',
    lease:  'text-violet-400 bg-violet-500/10',
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Input */}
      <div className={`
        relative flex items-center h-8 rounded-xl transition-all duration-200
        bg-white/[0.05] border
        ${open ? 'border-white/20 ring-1 ring-teal-500/20' : 'border-white/[0.08] hover:border-white/[0.14]'}
      `}>
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-500" />
        <input
          ref={inputRef}
          placeholder="Search..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8 pr-16 h-full text-[13px] bg-transparent focus:outline-none text-gray-200 placeholder-gray-600"
        />
        {!query && (
          <div className="absolute right-2.5 pointer-events-none">
            <kbd className="text-[10px] text-gray-600 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">⌘K</kbd>
          </div>
        )}
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-2.5 text-gray-600 hover:text-gray-400">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#161b22] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {searching ? (
            <div className="px-4 py-5 flex items-center justify-center gap-2 text-[12px] text-gray-500">
              <div className="h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] text-gray-500">
              No results for <span className="text-gray-300 font-medium">"{query}"</span>
            </div>
          ) : (
            <div className="py-1.5">
              {results.map((result) => {
                const Icon = typeIcon[result.type]
                return (
                  <button key={`${result.type}-${result.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] text-left transition-colors"
                    onClick={() => { setOpen(false); setQuery(''); setResults([]); router.push(result.href) }}>
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${typeColor[result.type]}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-gray-200 truncate">{result.title}</p>
                      <p className="text-[11px] text-gray-600 truncate">{result.subtitle}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeColor[result.type]}`}>
                      {result.type}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────
function NotificationsBell({ orgId }: { orgId: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [expiringLeases, setExpiringLeases] = useState<any[]>([])
  const [vacantCount, setVacantCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (orgId) load() }, [orgId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function load() {
    const db = supabase as any
    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const { data: expiring } = await db
      .from('leases').select('id, lease_end, tenants(first_name, last_name, company_name, tenant_type), units(unit_code)')
      .eq('organization_id', orgId).eq('status', 'active')
      .gte('lease_end', today).lte('lease_end', in30).order('lease_end')
    setExpiringLeases(expiring ?? [])

    const { data: buildings } = await db.from('buildings').select('id').eq('organization_id', orgId)
    const bIds = (buildings ?? []).map((b: any) => b.id)
    if (bIds.length) {
      const { data: units } = await db.from('units').select('id').in('building_id', bIds).eq('status', 'vacant')
      setVacantCount((units ?? []).length)
    }
  }

  const totalCount = expiringLeases.length + (vacantCount > 0 ? 1 : 0)

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-colors ${open ? 'bg-white/[0.08] text-gray-200' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'}`}>
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-[#161b22] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Notifications</p>
            {totalCount > 0 && (
              <span className="text-[10px] font-semibold text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-8 h-8 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                </div>
                <p className="text-[12px] font-medium text-gray-400">All caught up</p>
              </div>
            ) : (
              <div className="py-1.5">
                {vacantCount > 0 && (
                  <button onClick={() => { setOpen(false); router.push('/buildings') }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] text-left group">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg flex-shrink-0 mt-0.5">
                      <Home className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-200">{vacantCount} vacant unit{vacantCount !== 1 ? 's' : ''}</p>
                      <p className="text-[11px] text-gray-600">Consider assigning tenants</p>
                    </div>
                  </button>
                )}
                {expiringLeases.map((lease: any, i: number) => {
                  const t = lease.tenants
                  const name = t?.tenant_type === 'company' ? (t.company_name ?? 'Company') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const days = differenceInDays(new Date(lease.lease_end), new Date())
                  const urgent = days <= 7
                  return (
                    <button key={lease.id} onClick={() => { setOpen(false); router.push('/leases') }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] text-left border-t border-white/[0.04]">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${urgent ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                        <FileText className={`h-3.5 w-3.5 ${urgent ? 'text-rose-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-200 truncate">{name} — Unit {lease.units?.unit_code}</p>
                        <p className="text-[11px] text-gray-600">
                          Expires in <span className={`font-bold ${urgent ? 'text-rose-400' : 'text-amber-400'}`}>{days}d</span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-white/[0.06]">
            <button onClick={() => { setOpen(false); router.push('/dashboard') }}
              className="text-[11px] text-teal-500 hover:text-teal-400 font-medium transition-colors">
              View dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── User menu ─────────────────────────────────────────────────
function UserMenu() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const router = useRouter()
  const { currentOrg, userRole } = useOrgStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const roleInfo = userRole ? { owner: 'Owner', admin: 'Admin', manager: 'Manager', viewer: 'Viewer' }[userRole] : null

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all ${open ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}`}>
        <Avatar className="h-7 w-7">
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
          <AvatarFallback className="bg-gradient-to-br from-teal-600 to-teal-800 text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-[12px] font-semibold text-gray-200 leading-tight">{user?.fullName ?? 'Account'}</p>
        </div>
        <ChevronDown className={`h-3 w-3 text-gray-500 hidden sm:block transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#161b22] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Profile header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-gradient-to-br from-teal-600 to-teal-800 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{user?.fullName ?? 'Account'}</p>
                <p className="text-[11px] text-gray-600 truncate">{user?.primaryEmailAddress?.emailAddress ?? ''}</p>
              </div>
            </div>

            {/* Org context in dropdown */}
            {currentOrg && (
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-gray-600 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-gray-300 truncate">{currentOrg.name}</p>
                </div>
                {currentOrg.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-gray-600 flex-shrink-0" />
                    <p className="text-[11px] text-gray-500">{currentOrg.country}</p>
                  </div>
                )}
                {roleInfo && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-gray-600 flex-shrink-0" />
                    <p className="text-[11px] text-gray-500">Role: <span className="text-teal-400 font-semibold">{roleInfo}</span></p>
                  </div>
                )}
                {currentOrg.plan_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-md">
                      {currentOrg.plan_type}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {[
              { icon: User, label: 'Edit profile', action: () => { setOpen(false); openUserProfile() } },
              { icon: Settings, label: 'Settings', action: () => { setOpen(false); router.push('/settings') } },
            ].map((item) => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] text-left transition-colors">
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="border-t border-white/[0.06] py-1.5">
            <button onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-rose-500 hover:bg-rose-500/5 text-left transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main TopNav ───────────────────────────────────────────────
export default function TopNav() {
  const { orgId } = useAuth()

  // Warm up the store (loads org + role data)
  usePropertyType()

  return (
    <header className="h-16 flex-shrink-0 flex items-center px-5 gap-4 bg-[#0d1117]/95 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-40">
      {/* Search */}
      {orgId && <GlobalSearch orgId={orgId} />}

      {/* Right side */}
      <div className="flex items-center gap-1 ml-auto">
        {orgId && <NotificationsBell orgId={orgId} />}
        <div className="h-5 w-px bg-white/[0.08] mx-1" />
        <UserMenu />
      </div>
    </header>
  )
}
