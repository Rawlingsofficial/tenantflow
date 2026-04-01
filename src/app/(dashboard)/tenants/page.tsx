'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, Search, Users, ArrowUpRight, AlertTriangle, 
  Clock, CheckCircle2, UserCheck, Calendar,
  Building2, ArrowRight
} from 'lucide-react'
import AddTenantDialog from '@/components/tenants/AddTenantDialog'
import type { Tenant } from '@/types'
import { cn } from '@/lib/utils'

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
  const router = useRouter()
  const supabase = useSupabaseWithAuth()

  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [addOpen, setAddOpen] = useState(false)

  const loadTenants = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`*, leases(id, rent_amount, lease_start, lease_end, status,
          units(unit_code, buildings(name, building_type)),
          rent_payments(payment_date, status, amount))`)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error

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
    } catch (err: any) {
      console.error('Error loading tenants:', err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId, supabase])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

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
    const name = t.tenant_type === 'company' 
      ? (t.company_name || '') 
      : `${t.first_name || ''} ${t.last_name || ''}`
    
    const matchSearch = !q ||
      name.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.primary_phone?.includes(q) ||
      t.activeLease?.unit_code?.toLowerCase().includes(q) ||
      t.activeLease?.building_name?.toLowerCase().includes(q)
    
    if (!matchSearch) return false
    const ps = getPaymentStatus(t)
    if (filter === 'active') return t.status === 'active'
    if (filter === 'inactive') return t.status === 'inactive'
    if (filter === 'due_soon') return ps === 'due_soon'
    if (filter === 'overdue') return ps === 'overdue'
    return true
  })

  const activeCount  = tenants.filter((t) => t.status === 'active').length
  const overdueCount = tenants.filter((t) => getPaymentStatus(t) === 'overdue').length
  const dueSoonCount = tenants.filter((t) => getPaymentStatus(t) === 'due_soon').length
  const totalRev = tenants.reduce((s, t) => s + (t.activeLease?.rent_amount || 0), 0)

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
            <p className="text-[10px] font-bold tracking-[0.15em] text-teal-600 uppercase">Portfolio Directory</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tenants & Occupants</h1>
          <p className="text-sm text-slate-500 mt-1">
            Managing {activeCount} active leases across your properties.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search directory..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center gap-2 px-6 shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Add Tenant
          </Button>
        </div>
      </motion.div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Portfolio', value: tenants.length, icon: Users, color: 'teal' },
          { label: 'Active Leases', value: activeCount, icon: UserCheck, color: 'emerald' },
          { label: 'Pending / Due', value: dueSoonCount, icon: Clock, color: 'amber' },
          { label: 'Monthly Revenue', value: `$${totalRev.toLocaleString()}`, icon: Calendar, color: 'indigo' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              s.color === 'teal' && "bg-teal-50 text-teal-600",
              s.color === 'emerald' && "bg-emerald-50 text-emerald-600",
              s.color === 'amber' && "bg-amber-50 text-amber-600",
              s.color === 'indigo' && "bg-indigo-50 text-indigo-600",
            )}>
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        
        {/* Tab Navigation */}
        <div className="px-8 pt-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex gap-8">
            {[
              { id: 'all', label: 'All Tenants' },
              { id: 'active', label: 'Active' },
              { id: 'due_soon', label: 'Due Soon' },
              { id: 'overdue', label: 'Overdue' },
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
                    layoutId="activeTab"
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
                <Users className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No tenants found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-1">Try adjusting your search or add a new tenant to the directory.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-8 py-5 text-left font-bold">Tenant Identity</th>
                  <th className="px-6 py-5 text-left font-bold">Contact</th>
                  <th className="px-6 py-5 text-left font-bold">Location</th>
                  <th className="px-6 py-5 text-left font-bold">Monthly Rent</th>
                  <th className="px-6 py-5 text-left font-bold">Lease Health</th>
                  <th className="px-8 py-5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((tenant, i) => {
                  const isCompany = tenant.tenant_type === 'company'
                  const name = isCompany ? tenant.company_name : `${tenant.first_name} ${tenant.last_name}`
                  const initials = isCompany ? name?.[0] : `${tenant.first_name?.[0] || ''}${tenant.last_name?.[0] || ''}`
                  const al = tenant.activeLease
                  const ps = getPaymentStatus(tenant)

                  return (
                    <motion.tr
                      key={tenant.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50/80 cursor-pointer group transition-colors"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                            {tenant.photo_url ? (
                              <img src={tenant.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-slate-500 uppercase">{initials || '?'}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[15px] group-hover:text-teal-700 transition-colors leading-tight">{name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                                isCompany ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600"
                              )}>
                                {tenant.tenant_type}
                              </span>
                              {tenant.occupation && <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{tenant.occupation}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-700">{tenant.primary_phone || '—'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{tenant.email || 'No email'}</p>
                      </td>
                      <td className="px-6 py-5">
                        {al ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <p className="text-sm font-bold text-slate-800">{al.unit_code}</p>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">{al.building_name}</p>
                          </div>
                        ) : <span className="text-xs text-slate-300 font-medium italic">Unassigned</span>}
                      </td>
                      <td className="px-6 py-5">
                        {al ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-900">${al.rent_amount.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/mo</span>
                          </div>
                        ) : <span className="text-sm text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-fit border",
                            tenant.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", tenant.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                            {tenant.status}
                          </span>
                          {al && (
                            <div className="flex items-center gap-1">
                              {ps === 'paid' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                              {ps === 'due_soon' && <Clock className="h-3 w-3 text-amber-500" />}
                              {ps === 'overdue' && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                              <span className={cn(
                                "text-[9px] font-bold uppercase",
                                ps === 'paid' ? "text-emerald-600" : ps === 'due_soon' ? "text-amber-600" : ps === 'overdue' ? "text-rose-600" : "text-slate-400"
                              )}>
                                {ps.replace('_', ' ')}
                              </span>
                            </div>
                          )}
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

      <AddTenantDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); loadTenants() }}
        organizationId={orgId ?? ''}
      />
    </div>
  )
}
