'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, User, Home, MapPin, CreditCard, CheckCircle2,
  RefreshCw, XCircle, Pencil, Plus, CalendarDays, Loader2,
  ChevronRight, Building2, DollarSign, Receipt, Clock,
  AlertCircle, ShieldCheck, History, ArrowRight, Wallet,
  FileText, Briefcase, Wrench, X, Calendar, LayoutDashboard
} from 'lucide-react'
import { format, differenceInDays, differenceInMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Tab    = 'overview' | 'payments' | 'history'
type Action = null | 'extend' | 'renew' | 'end' | 'terminate' | 'payment'

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = useSupabaseWithAuth()

  const [lease, setLease] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [action, setAction] = useState<Action>(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const [payForm,    setPayForm]    = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
  const [extendForm, setExtendForm] = useState({ new_end_date: '', no_rent_change: true, new_rent: '' })
  const [renewForm,  setRenewForm]  = useState({ rent_amount: '', lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })

  const loadLease = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select(`*, tenants(id, first_name, last_name, primary_phone, email, photo_url, occupation, tenant_type, company_name, industry, contact_person),
          units(id, unit_code, unit_type, bedrooms, bathrooms, default_rent, building_id, unit_purpose, area_sqm, floor_number,
            buildings(id, name, address, building_type)),
          rent_payments(id, amount, payment_date, method, reference, status)`)
        .eq('id', id)
        .single()
      
      if (error) throw error
      const l = data as any
      setLease(l)
      if (l) {
        setPayForm(p => ({ ...p, amount: String(l.rent_amount) }))
        setExtendForm(p => ({ ...p, new_end_date: l.lease_end ?? '', new_rent: String(l.rent_amount) }))
        setRenewForm(p => ({ ...p, rent_amount: String(l.rent_amount) }))
      }
    } catch (err: any) {
      console.error('Error loading lease:', err.message)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    loadLease()
  }, [loadLease])

  async function handleAction(type: Action, payload: any) {
    setSaving(true); setError('')
    try {
      let res;
      if (type === 'payment') {
        res = await (supabase as any).from('rent_payments').insert({ ...payload, lease_id: id, status: 'completed' } as any)
      } else if (type === 'extend') {
        res = await (supabase as any).from('leases').update(payload as any).eq('id', id)
      } else if (type === 'renew') {
        await (supabase as any).from('leases').update({ status: 'ended' } as any).eq('id', id)
        res = await (supabase as any).from('leases').insert({ ...payload, organization_id: orgId, tenant_id: lease.tenant_id, unit_id: lease.unit_id, status: 'active' } as any)
        if (!res.error) {
          toast.success('Lease renewed successfully')
          router.push('/leases')
          return
        }
      } else if (type === 'end' || type === 'terminate') {
        await (supabase as any).from('leases').update(payload as any).eq('id', id)
        res = await (supabase as any).from('units').update({ status: 'vacant' } as any).eq('id', lease.unit_id)
      }

      if (res?.error) throw res.error
      toast.success('Action completed successfully')
      await loadLease()
      setAction(null)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
      <Skeleton className="h-8 w-48 rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-[32px]" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
    </div>
  )

  if (!lease) return null

  const tenant   = lease.tenants
  const unit     = lease.units
  const building = unit?.buildings
  const isCompany = tenant?.tenant_type === 'company'
  const displayName = isCompany ? tenant.company_name : `${tenant.first_name} ${tenant.last_name}`
  const initials = isCompany ? displayName?.[0] : `${tenant.first_name?.[0] || ''}${tenant.last_name?.[0] || ''}`

  const payments = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed')
    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  
  const statusConfig = {
    active:     { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' },
    ended:      { label: 'Ended', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
    terminated: { label: 'Terminated', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-500' },
  }[lease.status as string] || { label: lease.status, bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', dot: 'bg-slate-400' }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* Action Bar */}
      <div className="px-6 py-6 flex items-center justify-between">
        <button 
          onClick={() => router.push('/leases')}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-teal-200 group-hover:bg-teal-50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Agreements
        </button>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setAction('payment')}
            className="h-10 rounded-2xl border-slate-200 font-bold text-slate-600 px-5 hover:bg-white hover:border-teal-500 hover:text-teal-600 transition-all"
          >
            <CreditCard className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button 
            onClick={() => setAction('extend')}
            className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-6 shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all"
          >
            <Pencil className="h-4 w-4 mr-2" /> Manage Lease
          </Button>
        </div>
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Summary & Quick Details */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Context Card */}
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden p-8 relative">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
            
            <div className="relative flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] border-2 border-white shadow-xl flex items-center justify-center shrink-0">
                {tenant.photo_url ? (
                  <img src={tenant.photo_url} alt="" className="w-full h-full object-cover rounded-[18px]" />
                ) : (
                  <span className="text-xl font-black text-[#14b8a6]">{initials?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">{displayName}</h2>
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-2",
                  statusConfig.bg, statusConfig.text, statusConfig.border
                )}>
                  <div className={cn("w-1 h-1 rounded-full", statusConfig.dot)} />
                  {statusConfig.label}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Home className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Leased Space</p>
                  <p className="text-sm font-bold text-slate-800">{unit.unit_code} • {building.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{building.address || 'No address provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Monthly Rent</p>
                  <p className="text-lg font-black text-slate-900">${Number(lease.rent_amount).toLocaleString()}</p>
                  {Number(lease.service_charge) > 0 && (
                    <p className="text-[10px] font-bold text-teal-600 mt-0.5">+ ${Number(lease.service_charge).toLocaleString()} Service Charge</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Term Period</p>
                  <p className="text-sm font-bold text-slate-800">
                    {format(new Date(lease.lease_start), 'MMM dd, yyyy')} — {lease.lease_end ? format(new Date(lease.lease_end), 'MMM dd, yyyy') : 'Open'}
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="ghost" 
              className="w-full mt-10 h-11 rounded-2xl text-teal-600 font-bold bg-teal-50/50 hover:bg-teal-50 transition-all border border-teal-100/50"
              onClick={() => router.push(`/tenants/${tenant.id}`)}
            >
              View Full Profile <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Quick Action Modal Area */}
          <AnimatePresence>
            {action && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] border-2 border-teal-500/20 shadow-xl overflow-hidden p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-widest flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-teal-600" /> Manage Agreement
                  </h3>
                  <button onClick={() => setAction(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
                </div>

                {/* Local Action Forms */}
                {action === 'payment' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Received Amount</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                        <Input 
                          type="number" 
                          value={payForm.amount} 
                          onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                          className="h-11 pl-8 rounded-xl border-slate-200 bg-slate-50 font-black focus:bg-white" 
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold shadow-lg shadow-teal-600/20"
                      onClick={() => handleAction('payment', { 
                        amount: parseFloat(payForm.amount), 
                        payment_date: payForm.payment_date, 
                        method: payForm.method, 
                        reference: payForm.reference || null 
                      })}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
                    </Button>
                  </div>
                )}

                {action === 'extend' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">New End Date</Label>
                      <Input 
                        type="date" 
                        value={extendForm.new_end_date} 
                        onChange={e => setExtendForm(p => ({ ...p, new_end_date: e.target.value }))}
                        className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold focus:bg-white" 
                      />
                    </div>
                    <Button 
                      className="w-full h-11 rounded-xl bg-[#1B3B6F] hover:bg-[#162d52] font-bold text-white shadow-lg shadow-[#1B3B6F]/20"
                      onClick={() => handleAction('extend', { 
                        lease_end: extendForm.new_end_date, 
                        rent_amount: extendForm.no_rent_change ? lease.rent_amount : parseFloat(extendForm.new_rent) 
                      })}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Terms'}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Financials & History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Performance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Total Collections</p>
                <p className="text-xl font-black text-slate-900">${totalPaid.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Payment Rate</p>
                <p className="text-xl font-black text-slate-900">100%</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Tenure</p>
                <p className="text-xl font-black text-slate-900">{differenceInMonths(new Date(), new Date(lease.lease_start))} Months</p>
              </div>
            </div>
          </div>

          {/* Main Interactive Tabs */}
          <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-8 pt-6 border-b border-slate-100 flex gap-8 bg-slate-50/30">
              {[
                { id: 'overview', label: 'Lease Intelligence', icon: LayoutDashboard },
                { id: 'payments', label: 'Payment Ledger', icon: Receipt },
                { id: 'history', label: 'Change Log', icon: History },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={cn(
                    "pb-4 text-sm font-bold transition-all relative flex items-center gap-2",
                    activeTab === t.id ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {activeTab === t.id && (
                    <motion.div layoutId="detailTab" className="absolute bottom-0 inset-x-0 h-1 bg-teal-500 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8 flex-1">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-12"
                  >
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Asset Intelligence</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-500">Unit Purpose</span>
                            <span className="text-sm font-bold text-slate-900 capitalize">{unit.unit_purpose || 'Standard'}</span>
                          </div>
                          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-500">Total Area</span>
                            <span className="text-sm font-bold text-slate-900">{unit.area_sqm || 0} m²</span>
                          </div>
                          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-500">Floor Level</span>
                            <span className="text-sm font-bold text-slate-900">{unit.floor_number || 'Ground'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Contractual Milestones</h4>
                        <div className="space-y-4">
                          {[
                            { label: 'Agreement Signed', date: lease.lease_start, icon: CheckCircle2, color: 'text-emerald-500' },
                            { label: 'Next Renewal', date: lease.renewal_date, icon: RefreshCw, color: 'text-teal-500' },
                            { label: 'Term Expiration', date: lease.lease_end, icon: AlertCircle, color: 'text-amber-500' },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 group">
                              <div className="w-1 h-10 bg-slate-100 rounded-full group-hover:bg-teal-500 transition-colors" />
                              <div className={cn("w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100", item.color)}>
                                <item.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">{item.label}</p>
                                <p className="text-sm font-bold text-slate-800">{item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'Perpetual'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'payments' && (
                  <motion.div 
                    key="payments"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {payments.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 italic">No payments have been recorded yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {payments.map((p: any, i: number) => (
                          <div key={p.id} className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">${p.amount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.method} • {p.reference || 'REF-STD'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-700">{format(new Date(p.payment_date), 'MMM dd, yyyy')}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Approved</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
