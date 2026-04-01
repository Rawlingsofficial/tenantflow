'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Search, CheckCircle2, AlertCircle, Clock,
  CreditCard, Plus, Building2, ArrowUpRight, Receipt,
  FileText, Calendar, TrendingUp, User, LayoutDashboard,
  ShieldCheck, ArrowRight
} from 'lucide-react'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import { format } from 'date-fns'
import { usePropertyType } from '@/hooks/usePropertyType'
import { cn } from '@/lib/utils'

type FilterTab = 'all' | 'active' | 'expiring' | 'ended'

export default function LeasesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const { propertyType } = usePropertyType()
  const supabase = useSupabaseWithAuth()

  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)

  const loadLeases = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`*, tenants(id, first_name, last_name, primary_phone, photo_url, tenant_type, company_name),
          units(id, unit_code, buildings(id, name, building_type)),
          rent_payments(id, amount, payment_date, status, method)`)
        .eq('organization_id', orgId)
        .order('lease_start', { ascending: false })

      if (error) throw error
      setLeases(data || [])
    } catch (err: any) {
      console.error('Error loading leases:', err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    loadLeases()
  }, [loadLeases])

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const filtered = leases.filter(l => {
    const q = search.toLowerCase()
    const t = l.tenants
    const name = t?.tenant_type === 'company' 
      ? (t?.company_name || '') 
      : `${t?.first_name || ''} ${t?.last_name || ''}`
    
    const matchSearch = !q || name.toLowerCase().includes(q) || (l.units?.unit_code || '').toLowerCase().includes(q)
    if (!matchSearch) return false

    if (filter === 'active') return l.status === 'active'
    if (filter === 'ended') return l.status === 'ended' || l.status === 'terminated'
    if (filter === 'expiring') {
      if (l.status !== 'active' || !l.lease_end) return false
      const end = new Date(l.lease_end)
      return end > now && end <= in30Days
    }
    return true
  })

  const stats = {
    total: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    expiring: leases.filter(l => {
      if (l.status !== 'active' || !l.lease_end) return false
      const end = new Date(l.lease_end)
      return end > now && end <= in30Days
    }).length,
    revenue: leases.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.rent_amount), 0)
  }

  const getStatusConfig = (l: any) => {
    if (l.status === 'terminated') return { label: 'Terminated', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', dot: 'bg-rose-500' }
    if (l.status === 'ended') return { label: 'Ended', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', dot: 'bg-slate-400' }
    
    const end = l.lease_end ? new Date(l.lease_end) : null
    if (end && end < now) return { label: 'Expired', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', dot: 'bg-rose-500' }
    if (end && end <= in30Days) return { label: 'Expiring', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' }
    
    return { label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' }
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
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">Lease Administration</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lease Agreements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Managing {stats.active} active contractual agreements.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search agreements..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          <Button
            onClick={() => router.push('/buildings')}
            className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center gap-2 px-6 shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> New Lease
          </Button>
        </div>
      </motion.div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contracts', value: stats.total, icon: FileText, color: 'bg-slate-100 text-slate-600' },
          { label: 'Active Leases', value: stats.active, icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Expiring Soon', value: stats.expiring, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Monthly Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
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
              { id: 'all', label: 'All Agreements' },
              { id: 'active', label: 'Active' },
              { id: 'expiring', label: 'Expiring Soon' },
              { id: 'ended', label: 'Archived' },
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
                    layoutId="activeLeaseTab"
                    className="absolute bottom-0 inset-x-0 h-1 bg-teal-500 rounded-t-full" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <FileText className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No leases found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-1">Select a building and unit to assign your first tenant lease.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-8 py-5 text-left font-bold">Tenant Identity</th>
                  <th className="px-6 py-5 text-left font-bold">Property Location</th>
                  <th className="px-6 py-5 text-left font-bold">Lease Period</th>
                  <th className="px-6 py-5 text-left font-bold">Monthly Rent</th>
                  <th className="px-6 py-5 text-left font-bold">Agreement Status</th>
                  <th className="px-8 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((l, i) => {
                  const t = l.tenants
                  const isC = t?.tenant_type === 'company'
                  const name = isC ? t.company_name : `${t.first_name} ${t.last_name}`
                  const initials = isC ? name?.[0] : `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`
                  const cfg = getStatusConfig(l)

                  return (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/80 cursor-pointer group transition-colors"
                      onClick={() => router.push(`/leases/${l.id}`)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                            {t.photo_url ? (
                              <img src={t.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-slate-500 uppercase">{initials || '?'}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[15px] group-hover:text-teal-700 transition-colors leading-tight">{name}</p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 uppercase tracking-widest font-black">
                              <User className="h-3 w-3" />
                              {t.primary_phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <p className="text-sm font-bold text-slate-800">{l.units?.unit_code}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px] font-medium uppercase tracking-tighter">{l.units?.buildings?.name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-700">{format(new Date(l.lease_start), 'MMM dd, yyyy')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {l.lease_end ? `until ${format(new Date(l.lease_end), 'MMM dd, yyyy')}` : 'Open ended'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black text-slate-900">${Number(l.rent_amount).toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/mo</span>
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
    </div>
  )
}
