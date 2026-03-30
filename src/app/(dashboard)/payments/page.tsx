'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, CheckCircle2, Clock, X,
  CreditCard, DollarSign
} from 'lucide-react'
import { format, subMonths } from 'date-fns'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { HouseIcon, BuildingIcon } from '@/components/ui/portfolio-icons'

type FilterTab = 'all' | 'completed' | 'pending' | 'failed'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  status: string
  lease_id: string
  tenant_name: string
  tenant_initials: string
  tenant_photo: string | null
  tenant_phone: string | null
  unit_code: string
  building_name: string
  building_type: string | null
  lease_rent_amount: number
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money', cheque: 'Cheque', other: 'Other',
}

function PortfolioTag({ buildingType }: { buildingType?: string | null }) {
  const isCommercial = buildingType === 'commercial'
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
      isCommercial
        ? 'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20'
        : 'bg-teal-50 text-teal-700 border border-teal-200'
    }`}>
      {isCommercial
        ? <BuildingIcon className="w-2.5 h-2.5 text-[#1B3B6F]" />
        : <HouseIcon className="w-2.5 h-2.5 text-teal-600" />}
      {isCommercial ? 'Commercial' : 'Residential'}
    </span>
  )
}

export default function PaymentsPage() {
  const { orgId, getToken } = useAuth()
  const router = useRouter()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const token = await getToken({ template: 'supabase' });
    const supabase = getSupabaseBrowserClient(token ?? undefined);
    const { data: leaseRows } = await supabase
      .from('leases')
      .select(`id, rent_amount,
        tenants(first_name, last_name, photo_url, primary_phone, tenant_type, company_name),
        units(unit_code, buildings(name, building_type))`)
      .eq('organization_id', orgId!)

    if (!leaseRows || leaseRows.length === 0) { setPayments([]); setLoading(false); return }

    const leaseMap = Object.fromEntries((leaseRows as any[]).map(l => [l.id, l]))
    const leaseIds = (leaseRows as any[]).map(l => l.id)

    const { data: payRows } = await supabase
      .from('rent_payments')
      .select('id, amount, payment_date, method, reference, status, lease_id')
      .in('lease_id', leaseIds)
      .order('payment_date', { ascending: false })

    const enriched: Payment[] = ((payRows ?? []) as any[]).map(p => {
      const lease = leaseMap[p.lease_id] as any
      const t = lease?.tenants
      const u = lease?.units
      const isC = t?.tenant_type === 'company'
      const firstName = t?.first_name ?? ''
      const lastName = t?.last_name ?? ''
      const name = isC
        ? (t?.company_name ?? `${firstName} ${lastName}`.trim())
        : `${firstName} ${lastName}`.trim()
      const initials = isC
        ? (t?.company_name ?? 'C')[0].toUpperCase()
        : `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
      return {
        ...p,
        tenant_name: name || 'Unknown',
        tenant_initials: initials || '?',
        tenant_photo: t?.photo_url ?? null,
        tenant_phone: t?.primary_phone ?? null,
        unit_code: u?.unit_code ?? '—',
        building_name: u?.buildings?.name ?? '—',
        building_type: u?.buildings?.building_type ?? null,
        lease_rent_amount: Number(lease?.rent_amount ?? 0),
      }
    })

    setPayments(enriched)
    setLoading(false)
  }

  const now = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM')

  const completed = payments.filter(p => p.status === 'completed')
  const pending = payments.filter(p => p.status === 'pending')
  const failed = payments.filter(p => p.status === 'failed')

  const totalAllTime = completed.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthTotal = completed.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const lastMonthTotal = completed.filter(p => p.payment_date?.startsWith(lastMonth)).reduce((s, p) => s + Number(p.amount), 0)
  const pendingTotal = pending.reduce((s, p) => s + Number(p.amount), 0)

  const allMonths = Array.from(new Set(payments.map(p => p.payment_date?.substring(0, 7)).filter(Boolean)))
    .sort((a, b) => (b as string).localeCompare(a as string)).slice(0, 12) as string[]

  const displayed = payments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.tenant_name.toLowerCase().includes(q) ||
      p.unit_code.toLowerCase().includes(q) || p.building_name.toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'pending') return p.status === 'pending'
    if (filter === 'failed') return p.status === 'failed'
    if (selectedMonth !== 'all') return p.payment_date?.startsWith(selectedMonth)
    return true
  })

  const tabs = [
    { label: 'All', value: 'all' as FilterTab, count: payments.length },
    { label: 'Completed', value: 'completed' as FilterTab, count: completed.length },
    { label: 'Pending', value: 'pending' as FilterTab, count: pending.length },
    { label: 'Failed', value: 'failed' as FilterTab, count: failed.length },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="px-6 pt-6 pb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {completed.length} payments recorded · ${totalAllTime.toLocaleString()} all time
          </p>
        </div>
        <Button onClick={() => setRecordOpen(true)}
          className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl gap-1.5 px-4 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Record Payment
        </Button>
      </motion.div>

      {/* Stat cards */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {/* ...keep your stat cards here as-is, no mixed checks */}
      </div>

      {/* Tabs + filters */}
      <div className="px-6 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-0.5">
          {tabs.map(tab => (
            <button key={tab.value} onClick={() => { setFilter(tab.value); setSelectedMonth('all') }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                filter === tab.value ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          {/* Month filter */}
          {allMonths.length > 1 && (
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setFilter('all') }}
              className="h-8 px-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/25">
              <option value="all">All months</option>
              {allMonths.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
            </select>
          )}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search payments…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 w-48 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400/25" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 shadow-sm overflow-hidden">
          {/* ...table JSX remains mostly unchanged */}
        </div>
      </div>

      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={() => { setRecordOpen(false); load() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}

