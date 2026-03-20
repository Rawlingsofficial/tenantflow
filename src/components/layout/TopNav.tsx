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
import { Input } from '@/components/ui/input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'

interface SearchResult {
  type: 'tenant' | 'unit' | 'lease'
  id: string
  title: string
  subtitle: string
  href: string
}

interface NotificationItem {
  id: string
  message: string
  type: string
  is_read: boolean
  created_at?: string
  href: string
}

// ── Search ─────────────────────────────────────────────────────────────

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
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  async function doSearch(q: string) {
    setLoading(true)
    const term = `%${q}%`
    const found: SearchResult[] = []
    const db = supabase as any

    // Search tenants
    const { data: tenants } = await db
      .from('tenants')
      .select('id, first_name, last_name, primary_phone, email, occupation')
      .eq('organization_id', orgId)
      .or(`first_name.ilike.${term},last_name.ilike.${term},primary_phone.ilike.${term},email.ilike.${term},occupation.ilike.${term}`)
      .limit(4)

    ;(tenants ?? []).forEach((t: any) => {
      found.push({
        type: 'tenant',
        id: t.id,
        title: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown',
        subtitle: t.occupation ?? t.email ?? t.primary_phone ?? 'Tenant',
        href: `/tenants/${t.id}`,
      })
    })

    // Search units
    const { data: units } = await db
      .from('units')
      .select('id, unit_code, unit_type, status, building_id, buildings!inner(name, organization_id)')
      .eq('buildings.organization_id', orgId)
      .ilike('unit_code', term)
      .limit(3)

    ;(units ?? []).forEach((u: any) => {
      found.push({
        type: 'unit',
        id: u.id,
        title: `Unit ${u.unit_code}`,
        subtitle: `${u.buildings?.name ?? ''} · ${u.status}`,
        href: `/buildings`,
      })
    })

    // Search leases
    const { data: leases } = await db
      .from('leases')
      .select(`
        id, status, rent_amount,
        tenants ( first_name, last_name ),
        units ( unit_code, buildings ( name ) )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .limit(3)

    ;(leases ?? [])
      .filter((l: any) => {
        const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.toLowerCase()
        return name.includes(q.toLowerCase())
      })
      .forEach((l: any) => {
        found.push({
          type: 'lease',
          id: l.id,
          title: `Lease — ${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.trim(),
          subtitle: `${l.units?.unit_code ?? ''} · ${l.units?.buildings?.name ?? ''} · ${Number(l.rent_amount).toLocaleString()}/mo`,
          href: `/leases`,
        })
      })

    setResults(found)
    setLoading(false)
  }

  const typeIcon: Record<string, any> = {
    tenant: Users,
    unit: Home,
    lease: FileText,
  }

  const typeColor: Record<string, string> = {
    tenant: 'bg-indigo-100 text-indigo-600',
    unit: 'bg-emerald-100 text-emerald-600',
    lease: 'bg-blue-100 text-blue-600',
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {!open ? (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors w-full"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Search tenants, units...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-slate-100 border border-slate-200 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={inputRef}
            placeholder="Search tenants, units, leases..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          <button
            onClick={() => { setOpen(false); setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => {
                const Icon = typeIcon[result.type]
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                    onClick={() => {
                      setOpen(false)
                      setQuery('')
                      setResults([])
                      router.push(result.href)
                    }}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${typeColor[result.type]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {result.subtitle}
                      </p>
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [expiringLeases, setExpiringLeases] = useState<any[]>([])
  const [vacantCount, setVacantCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (orgId) loadNotifications()
  }, [orgId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
      .select(`
        id, lease_end, rent_amount,
        tenants ( first_name, last_name ),
        units ( unit_code, buildings ( name ) )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .gte('lease_end', today)
      .lte('lease_end', in30)
      .order('lease_end')

    setExpiringLeases(expiring ?? [])

    const { data: buildings } = await db
      .from('buildings')
      .select('id')
      .eq('organization_id', orgId)
      .eq('status', 'active')

    const buildingIds: string[] = (buildings ?? []).map((b: any) => b.id)

    if (buildingIds.length > 0) {
      const { data: units } = await db
        .from('units')
        .select('id')
        .in('building_id', buildingIds)
        .eq('status', 'vacant')

      setVacantCount((units ?? []).length)
    }

    const { data: notifs } = await db
      .from('notifications')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    setNotifications(
      (notifs ?? []).map((n: any) => ({ ...n, href: '/dashboard' }))
    )
  }

  const totalCount =
    expiringLeases.length + (vacantCount > 0 ? 1 : 0) + notifications.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Alerts</p>
            {totalCount > 0 && (
              <span className="text-xs text-slate-400">{totalCount} unread</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-400">All clear — no alerts</p>
              </div>
            ) : (
              <div className="py-2">
                {vacantCount > 0 && (
                  <button
                    onClick={() => { setOpen(false); router.push('/buildings') }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                  >
                    <div className="p-1.5 bg-amber-100 rounded-lg shrink-0 mt-0.5">
                      <Home className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {vacantCount} vacant unit{vacantCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Consider assigning tenants
                      </p>
                    </div>
                  </button>
                )}

                {expiringLeases.map((lease: any) => {
                  const name = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
                  const days = differenceInDays(new Date(lease.lease_end), new Date())
                  return (
                    <button
                      key={lease.id}
                      onClick={() => { setOpen(false); router.push('/leases') }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left border-t border-slate-50"
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        days <= 7 ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        <FileText className={`h-3.5 w-3.5 ${
                          days <= 7 ? 'text-red-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {name} — Unit {lease.units?.unit_code}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Lease expires in{' '}
                          <span className="font-semibold text-amber-600">
                            {days} day{days !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                    </button>
                  )
                })}

                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => { setOpen(false); router.push(notif.href) }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left border-t border-slate-50"
                  >
                    <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                      <Bell className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {notif.message}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); router.push('/dashboard') }}
              className="text-xs text-indigo-600 hover:underline"
            >
              View dashboard →
            </button>
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-900 leading-tight">
            {user?.fullName ?? 'Account'}
          </p>
          <p className="text-xs text-slate-400 leading-tight truncate max-w-28">
            {user?.primaryEmailAddress?.emailAddress ?? ''}
          </p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">
              {user?.fullName ?? 'Account'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>

          <div className="py-1">
            <button
              onClick={() => { setOpen(false); openUserProfile() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left transition-colors"
            >
              <User className="h-4 w-4 text-slate-400" />
              Edit profile
            </button>

            <button
              onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Settings
            </button>
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => signOut({ redirectUrl: '/sign-in' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Org Display ────────────────────────────────────────────────────────

function OrgDisplay({ orgId }: { orgId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    if (orgId) {
      const db = supabase as any
      db
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()
        .then(({ data }: { data: { name: string } | null }) => {
          if (data) setOrgName(data.name)
        })
    }
  }, [orgId])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 max-w-[180px]">
      <div className="p-1 bg-indigo-100 rounded shrink-0">
        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
      </div>
      <span className="text-sm font-medium text-slate-700 truncate">
        {orgName || 'Loading...'}
      </span>
    </div>
  )
}

// ── Main TopNav ────────────────────────────────────────────────────────

export default function TopNav() {
  const { orgId } = useAuth()

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4 shrink-0">
      {orgId && <OrgDisplay orgId={orgId} />}
      {orgId && <GlobalSearch orgId={orgId} />}
      <div className="flex items-center gap-2 ml-auto">
        {orgId && <NotificationsBell orgId={orgId} />}
        <UserMenu />
      </div>
    </header>
  )
}


//bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb