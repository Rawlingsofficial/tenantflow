'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import {
  Bell, Search, X, Building2, Users,
  FileText, Home, LogOut, Settings,
  User, ChevronDown, CheckCircle2
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

// ── Org loader: populates Zustand store from Supabase ─────────────────

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

  return null // invisible — just loads the store
}

// ── Global Search ──────────────────────────────────────────────────────

function GlobalSearch({ orgId }: { orgId: string }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
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

    // Two-step units search (no join filter)
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

  const typeColor: Record<string, string> = {
    tenant: 'bg-blue-100 text-blue-600',
    unit: 'bg-teal-100 text-teal-600',
    lease: 'bg-purple-100 text-purple-600',
  }
  const typeIcon: Record<string, any> = { tenant: Users, unit: Home, lease: FileText }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          placeholder="Search tenants, units... ⌘K"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-9 h-9 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-slate-700 placeholder-slate-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-5 text-center text-sm text-slate-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-slate-400">No results for "{query}"</div>
          ) : (
            <div className="py-2">
              {results.map((result) => {
                const Icon = typeIcon[result.type]
                return (
                  <button key={`${result.type}-${result.id}`}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                    onClick={() => { setOpen(false); setQuery(''); setResults([]); router.push(result.href) }}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${typeColor[result.type]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                      <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColor[result.type]}`}>
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

// ── Notifications ──────────────────────────────────────────────────────

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

    // Two-step for vacant count
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
      <button onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {totalCount > 0 && <span className="text-xs text-slate-400">{totalCount} alerts</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-teal-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-400">All clear</p>
              </div>
            ) : (
              <div className="py-2">
                {vacantCount > 0 && (
                  <button onClick={() => { setOpen(false); router.push('/buildings') }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    <div className="p-1.5 bg-amber-100 rounded-lg shrink-0 mt-0.5">
                      <Home className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{vacantCount} vacant unit{vacantCount !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Consider assigning tenants</p>
                    </div>
                  </button>
                )}
                {expiringLeases.map((lease: any) => {
                  const t = lease.tenants
                  const name = t?.tenant_type === 'company'
                    ? (t.company_name ?? 'Company')
                    : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const days = differenceInDays(new Date(lease.lease_end), new Date())
                  return (
                    <button key={lease.id} onClick={() => { setOpen(false); router.push('/leases') }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left border-t border-slate-50">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${days <= 7 ? 'bg-red-100' : 'bg-amber-100'}`}>
                        <FileText className={`h-3.5 w-3.5 ${days <= 7 ? 'text-red-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{name} — Unit {lease.units?.unit_code}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Expires in <span className="font-semibold text-amber-600">{days}d</span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100">
            <button onClick={() => { setOpen(false); router.push('/dashboard') }}
              className="text-xs text-teal-600 hover:underline">View dashboard →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── User Menu ──────────────────────────────────────────────────────────

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
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
          <AvatarFallback className="bg-[#1B3B6F] text-white text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.fullName ?? 'Account'}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{user?.fullName ?? 'Account'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress ?? ''}</p>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); openUserProfile() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left">
              <User className="h-4 w-4 text-slate-400" /> Edit profile
            </button>
            <button onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left">
              <Settings className="h-4 w-4 text-slate-400" /> Settings
            </button>
          </div>
          <div className="border-t border-slate-100 py-1">
            <button onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main TopNav ────────────────────────────────────────────────────────

export default function TopNav() {
  const { orgId } = useAuth()

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4 shrink-0">
      {/* Loads org into Zustand store — invisible */}
      {orgId && <OrgLoader orgId={orgId} />}

      {/* Org name + property type badge */}
      <OrgSwitcher />

      {/* Global search */}
      {orgId && <GlobalSearch orgId={orgId} />}

      <div className="flex items-center gap-2 ml-auto">
        {orgId && <NotificationsBell orgId={orgId} />}
        <UserMenu />
      </div>
    </header>
  )
}
