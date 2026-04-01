'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, CheckCircle2, Clock, X,
  CreditCard, DollarSign, ArrowUpRight,
  TrendingUp, AlertCircle, Calendar, Filter,
  Building2, User, ArrowRight
} from 'lucide-react'
import { format, subMonths } from 'date-fns'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { HouseIcon, BuildingIcon } from '@/components/ui/portfolio-icons'
import { cn } from '@/lib/utils'

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

export default function PaymentsPage() {
  const { orgId } = useAuth()
  const supabase = useSupabaseWithAuth()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data: leaseRows } = await supabase
        .from('leases')
        .select(`id, rent_amount,
          tenants(first_name, last_name, photo_url, primary_phone, tenant_type, company_name),
          units(unit_code, buildings(name, building_type))`)
        .eq('organization_id', orgId)

      if (!leaseRows || leaseRows.length === 0) { 
        setPayments([])
        return 
      }

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
    } catch (err: any) {
      console.error('Error loading payments:', err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const now = new Date()
  const thisMonthStr = format(now, 'yyyy-MM')
  
  const completed = payments.filter(p => p.status === 'completed')
  const totalAllTime = completed.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthTotal = completed.filter(p => p.payment_date?.startsWith(thisMonthStr)).reduce((s, p) => s + Number(p.amount), 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length
  const failedCount = payments.filter(p => p.status === 'failed').length

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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { label: 'Paid', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' }
      case 'pending':   return { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' }
      case 'failed':    return { label: 'Failed', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', dot: 'bg-rose-500' }
      default:          return { label: status, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 rounded-full bg-teal-500" />
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">Financial Operations</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Revenue & Payments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tracking ${totalAllTime.toLocaleString()} in total collections.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search transactions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          <Button
            onClick={() => setRecordOpen(true)}
            className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center gap-2 px-6 shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Record Payment
          </Button>
        </div>
      </motion.div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Collections', value: `$${totalAllTime.toLocaleString()}`, icon: DollarSign, color: 'bg-slate-100 text-slate-600' },
          { label: 'This Month', value: `$${thisMonthTotal.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Failed Payments', value: failedCount, icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", s.color)}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Tab Navigation */}
        <div className="px-8 pt-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex gap-8">
            {[
              { id: 'all', label: 'All History' },
              { id: 'completed', label: 'Completed' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as FilterTab)}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative",
                  filter === t.id ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
                {filter === t.id && (
                  <motion.div 
                    layoutId="activePayTab"
                    className="absolute bottom-0 inset-x-0 h-1 bg-teal-500 rounded-t-full" 
                  />
                )}
              </button>
            ))}
          </div>

          <div className="pb-4">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
            >
              <option value="all">All Time</option>
              {allMonths.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <CreditCard className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No transactions found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-1">Record your first payment to begin tracking property revenue.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-8 py-5 text-left font-bold">Tenant Identity</th>
                  <th className="px-6 py-5 text-left font-bold">Property Details</th>
                  <th className="px-6 py-5 text-left font-bold">Amount</th>
                  <th className="px-6 py-5 text-left font-bold">Payment Method</th>
                  <th className="px-6 py-5 text-left font-bold">Status</th>
                  <th className="px-8 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((p, i) => {
                  const cfg = getStatusConfig(p.status)
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/80 cursor-pointer group transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                            {p.tenant_photo ? (
                              <img src={p.tenant_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-slate-500 uppercase">{p.tenant_initials}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[15px] group-hover:text-teal-700 transition-colors leading-tight">{p.tenant_name}</p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 uppercase tracking-widest font-black">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(p.payment_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <p className="text-sm font-bold text-slate-800">{p.unit_code}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px] font-medium uppercase tracking-tighter">{p.building_name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black text-slate-900">${p.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">USD</span>
                        </div>
                        {p.amount < p.lease_rent_amount && (
                          <p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Partial Payment</p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                            <CreditCard className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{(METHOD_LABEL[p.method ?? ''] ?? p.method) || 'Other'}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.reference || 'No Reference'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit",
                          cfg.bg, cfg.color, cfg.border
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
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
