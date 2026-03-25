export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Users, ArrowUpRight, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import AddTenantDialog from '@/components/tenants/AddTenantDialog'
import type { Tenant } from '@/types'

type FilterTab = 'all' | 'active' | 'inactive' | 'due_soon' | 'overdue'

interface TenantRow extends Tenant {
  activeLease?: {
    id: string
    unit_code: string
    building_name: string
    building_type: string
    rent_amount: number
    lease_start: string
    lease_end: string | null
    last_payment_date: string | null
  }
}

export default function TenantsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (orgId) loadTenants()
  }, [orgId])

  async function loadTenants() {
    setLoading(true)
    const { data } = await supabase
      .from('tenants')
      .select(`*, leases(id, rent_amount, lease_start, lease_end, status,
        units(unit_code, buildings(name, building_type)),
        rent_payments(payment_date, status, amount))`)
      .eq('organization_id', orgId!)
      .order('first_name')

    const enriched: TenantRow[] = (data || []).map((t: any) => {
      const activeLease = (t.leases || []).find((l: any) => l.status === 'active')
      const lastPayment = activeLease?.rent_payments
        ?.filter((p: any) => p.status === 'completed')
        ?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())?.[0]
      return {
        ...t,
        activeLease: activeLease ? {
          id: activeLease.id,
          unit_code: activeLease.units?.unit_code,
          building_name: activeLease.units?.buildings?.name,
          building_type: activeLease.units?.buildings?.building_type ?? 'residential',
          rent_amount: activeLease.rent_amount,
          lease_start: activeLease.lease_start,
          lease_end: activeLease.lease_end,
          last_payment_date: lastPayment?.payment_date ?? null,
        } : undefined,
      }
    })

    setTenants(enriched)
    setLoading(false)
  }

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  function getPaymentStatus(t: TenantRow): 'paid' | 'due_soon' | 'overdue' | 'none' {
    if (!t.activeLease) return 'none'
    const leaseEnd = t.activeLease.lease_end ? new Date(t.activeLease.lease_end) : null
    if (leaseEnd && leaseEnd < now) return 'overdue'
    if (leaseEnd && leaseEnd < in30) return 'due_soon'
    if (t.activeLease.last_payment_date) {
      const daysSince = (now.getTime() - new Date(t.activeLease.last_payment_date).getTime()) / 86400000
      if (daysSince > 35) return 'overdue'
      if (daysSince > 25) return 'due_soon'
      return 'paid'
    }
    return 'none'
  }

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.primary_phone?.includes(q) ||
      t.activeLease?.unit_code?.toLowerCase().includes(q) ||
      t.activeLease?.building_name?.toLowerCase().includes(q)
    if (!matchSearch) return false
    const ps = getPaymentStatus(t)
    if (filter === 'active') return t.status === 'active' && !!t.activeLease
    if (filter === 'inactive') return t.status === 'inactive'
    if (filter === 'due_soon') return ps === 'due_soon'
    if (filter === 'overdue') return ps === 'overdue'
    return true
  })

  const active  = tenants.filter((t) => t.status === 'active' && t.activeLease).length
  const overdue = tenants.filter((t) => getPaymentStatus(t) === 'overdue').length
  const dueSoon = tenants.filter((t) => getPaymentStatus(t) === 'due_soon').length
  const totalRev = tenants.reduce((s, t) => s + (t.activeLease?.rent_amount || 0), 0)

  const tabs: { label: string; value: FilterTab; count?: number; dot?: string }[] = [
    { label: 'All', value: 'all', count: tenants.length },
    { label: 'Active', value: 'active', count: active },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Due Soon', value: 'due_soon', count: dueSoon, dot: 'bg-amber-400' },
    { label: 'Overdue', value: 'overdue', count: overdue, dot: 'bg-red-500' },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header, stats, filters, table ... same as before */}
    </div>
  )
}

