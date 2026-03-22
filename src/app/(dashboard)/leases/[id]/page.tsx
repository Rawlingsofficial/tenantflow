'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, User, Home, MapPin, CreditCard, CheckCircle2,
  RefreshCw, XCircle, Pencil, Plus, CalendarDays, Loader2,
  ChevronRight, Building2, DollarSign, Receipt
} from 'lucide-react'
import { format, differenceInDays, differenceInMonths } from 'date-fns'

function val<T>(v: T): never { return v as never }
type Tab    = 'overview' | 'payments' | 'actions'
type Action = null | 'extend' | 'renew' | 'end' | 'terminate' | 'payment'
const IC    = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [lease,  setLease]  = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab,    setTab]    = useState<Tab>('overview')
  const [action, setAction] = useState<Action>(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const [payForm,    setPayForm]    = useState<{ amount: string; payment_date: string; method: string; reference: string }>({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
  const [extendForm, setExtendForm] = useState({ new_end_date: '', no_rent_change: true, new_rent: '' })
  const [renewForm,  setRenewForm]  = useState({ rent_amount: '', lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })

  useEffect(() => { if (id) loadLease() }, [id])

  async function loadLease() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*, tenants(id, first_name, last_name, primary_phone, email, photo_url, occupation, tenant_type, company_name, industry, contact_person),
        units(id, unit_code, unit_type, bedrooms, bathrooms, default_rent, building_id, unit_purpose, area_sqm, floor_number,
          buildings(id, name, address, building_type)),
        rent_payments(id, amount, payment_date, method, reference, status)`)
      .eq('id', id).single()
    const l = data as any
    setLease(l)
    if (l) {
      setPayForm(p    => ({ ...p, amount: String(l.rent_amount) }))
      setExtendForm(p => ({ ...p, new_end_date: l.lease_end ?? '', new_rent: String(l.rent_amount) }))
      setRenewForm(p  => ({ ...p, rent_amount: String(l.rent_amount) }))
    }
    setLoading(false)
  }

  async function handlePayment() {
    if (!payForm.amount) { setError('Amount required'); return }
    setSaving(true); setError('')
    try {
      const { error: e } = await supabase.from('rent_payments').insert(val({
        lease_id: id, amount: parseFloat(payForm.amount), payment_date: payForm.payment_date,
        method: payForm.method, reference: payForm.reference || null, status: 'completed'
      }))
      if (e) throw e
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  async function handleExtend() {
    if (!extendForm.new_end_date) { setError('New end date required'); return }
    setSaving(true); setError('')
    try {
      const rent = extendForm.no_rent_change ? lease.rent_amount : parseFloat(extendForm.new_rent)
      const { error: e } = await supabase.from('leases').update(val({ lease_end: extendForm.new_end_date, rent_amount: rent })).eq('id', id)
      if (e) throw e
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  async function handleRenew() {
    if (!renewForm.rent_amount || !renewForm.lease_start) { setError('Rent and start date required'); return }
    setSaving(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended' })).eq('id', id)
      await supabase.from('leases').insert(val({
        organization_id: orgId, tenant_id: lease.tenant_id, unit_id: lease.unit_id,
        rent_amount: parseFloat(renewForm.rent_amount), lease_start: renewForm.lease_start,
        lease_end: renewForm.lease_end || null, renewal_date: renewForm.renewal_date || null, status: 'active'
      }))
      router.push('/leases')
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  async function handleEnd() {
    setSaving(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended', lease_end: new Date().toISOString().split('T')[0] })).eq('id', id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  async function handleTerminate() {
    setSaving(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'terminated' })).eq('id', id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50/70 p-6 space-y-4">
      <Skeleton className="h-8 w-32 rounded-xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
    </div>
  )
  if (!lease) return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 text-sm">Lease not found.</p>
        <Button variant="outline" className="mt-3 rounded-xl" onClick={() => router.push('/leases')}>Back to Leases</Button>
      </div>
    </div>
  )

  const tenant   = lease.tenants
  const unit     = lease.units
  const building = unit?.buildings
  const isCompany        = tenant?.tenant_type === 'company'
  const isCommercialUnit = building?.building_type === 'commercial'

  const displayName = isCompany
    ? (tenant?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim())
    : `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
  const initial = isCompany
    ? (tenant?.company_name ?? 'C')[0].toUpperCase()
    : `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()

  const payments     = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed')
    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid    = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const daysLeft     = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
  const monthsActive = differenceInMonths(new Date(), new Date(lease.lease_start))
  const thisMonth    = format(new Date(), 'yyyy-MM')
  const paidThisMonth = payments.some((p: any) => p.payment_date?.startsWith(thisMonth))
  const sc           = Number(lease.service_charge ?? 0)
  const escalation   = lease.escalation_rate
  const defaultRent  = unit?.default_rent
  const rentDiff     = defaultRent ? Number(lease.rent_amount) - Number(defaultRent) : 0

  const statusStyle: Record<string, string> = {
    active:     'bg-teal-50 text-teal-700 border border-teal-200',
    ended:      'bg-slate-100 text-slate-500 border border-slate-200',
    terminated: 'bg-red-50 text-red-600 border border-red-200',
  }

  const tabs = [
    { key: 'overview' as Tab,  label: 'Overview' },
    { key: 'payments' as Tab,  label: 'Payments', count: payments.length },
    { key: 'actions'  as Tab,  label: 'Actions'  },
  ]

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">

      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="px-6 pt-5 pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => router.push('/leases')} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="hover:text-slate-800 cursor-pointer" onClick={() => router.push('/leases')}>Leases</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-800 font-semibold">{displayName}</span>
        </div>
        {lease.status === 'active' && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setTab('actions'); setAction('payment') }}
              className="h-8 text-xs rounded-xl border-slate-200 gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </Button>
            <Button size="sm" onClick={() => { setTab('actions'); setAction('extend') }}
              className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl gap-1.5 shadow-sm">
              <Pencil className="h-3.5 w-3.5" /> Edit Lease
            </Button>
          </div>
        )}
      </motion.div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 mb-4"
      >
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#1B3B6F] via-teal-500 to-teal-400" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center flex-shrink-0 shadow-sm">
                  {tenant?.photo_url
                    ? <img src={tenant.photo_url} alt={displayName} className="w-full h-full object-cover" />
                    : <span className="text-xl font-bold text-[#14b8a6]">{initial}</span>}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyle[lease.status] ?? statusStyle.ended}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${lease.status === 'active' ? 'bg-teal-500 animate-pulse' : lease.status === 'terminated' ? 'bg-red-500' : 'bg-slate-400'}`} />
                      {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                    </span>
                    {!paidThisMonth && lease.status === 'active' && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Unpaid this month</span>
                    )}
                    {isCommercialUnit && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/15">
                        <Building2 className="h-3 w-3" /> Commercial
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isCompany ? (tenant?.industry ?? 'Company') : (tenant?.occupation ?? 'No occupation')}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {unit?.unit_code} · {building?.name}</span>
                    {building?.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" /> {building.address}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => router.push(`/tenants/${lease.tenant_id}`)}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors">
                <User className="h-3.5 w-3.5" /> View profile
              </button>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
              {[
                {
                  label: 'Monthly Rent',
                  value: `$${Number(lease.rent_amount).toLocaleString()}`,
                  sub: sc > 0 ? `+$${sc.toLocaleString()} SC` : undefined,
                  color: 'text-slate-900',
                },
                {
                  label: 'Total Paid',
                  value: `$${totalPaid.toLocaleString()}`,
                  sub: `${payments.length} payments`,
                  color: 'text-teal-600',
                },
                {
                  label: 'Tenancy',
                  value: `${monthsActive}mo`,
                  sub: `since ${format(new Date(lease.lease_start), 'MMM yyyy')}`,
                  color: 'text-slate-900',
                },
                daysLeft !== null ? {
                  label: 'Lease End',
                  value: `${Math.abs(daysLeft)}d`,
                  sub: daysLeft < 0 ? 'overdue' : 'remaining',
                  color: daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-900',
                } : {
                  label: 'Lease End',
                  value: 'Open',
                  sub: 'no end date',
                  color: 'text-teal-600',
                },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 tabular-nums ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-0.5 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setAction(null); setError('') }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5"
          >
            {/* Lease terms */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Lease Terms</p>
              <div className="grid grid-cols-2 gap-0">
                {[
                  { label: 'Start Date',    value: format(new Date(lease.lease_start), 'MMMM d, yyyy') },
                  { label: 'End Date',      value: lease.lease_end ? format(new Date(lease.lease_end), 'MMMM d, yyyy') : 'Open-ended' },
                  { label: 'Renewal Date',  value: lease.renewal_date ? format(new Date(lease.renewal_date), 'MMMM d, yyyy') : '—' },
                  { label: 'Payment Due',   value: `${format(new Date(lease.lease_start), 'do')} of every month` },
                ].map(row => (
                  <div key={row.label} className="py-2.5 px-0 border-b border-slate-50 last:border-0">
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Commercial details section */}
            {isCommercialUnit && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Commercial Details</p>
                <div className="grid grid-cols-3 gap-3">
                  {sc > 0 && (
                    <div className="bg-[#1B3B6F]/5 rounded-xl p-3 border border-[#1B3B6F]/10">
                      <p className="text-[10px] font-semibold text-[#1B3B6F]/60 uppercase tracking-wider">Service Charge</p>
                      <p className="text-sm font-bold text-[#1B3B6F] mt-0.5 tabular-nums">${sc.toLocaleString()}/mo</p>
                    </div>
                  )}
                  {escalation && (
                    <div className="bg-teal-50 rounded-xl p-3 border border-teal-200">
                      <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Escalation</p>
                      <p className="text-sm font-bold text-teal-700 mt-0.5">{escalation}%/yr</p>
                    </div>
                  )}
                  {lease.payment_terms && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment Terms</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{lease.payment_terms} days</p>
                    </div>
                  )}
                  {unit?.area_sqm && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Area</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{unit.area_sqm} m²</p>
                    </div>
                  )}
                  {unit?.floor_number && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Floor</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">Floor {unit.floor_number}</p>
                    </div>
                  )}
                  {unit?.unit_purpose && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Space Type</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{unit.unit_purpose}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Residential: rent comparison */}
            {!isCommercialUnit && defaultRent && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Rent Analysis</p>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Unit Default</p>
                    <p className="text-lg font-bold text-slate-600 tabular-nums">${Number(defaultRent).toLocaleString()}/mo</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    rentDiff > 0 ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                    rentDiff < 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                   'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {rentDiff === 0 ? 'At default' : rentDiff > 0 ? `+$${rentDiff.toLocaleString()} above` : `-$${Math.abs(rentDiff).toLocaleString()} below`}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Agreed Rent</p>
                    <p className="text-lg font-bold text-slate-900 tabular-nums">${Number(lease.rent_amount).toLocaleString()}/mo</p>
                  </div>
                </div>
              </div>
            )}

            {/* Expiry alert */}
            {daysLeft !== null && daysLeft <= 30 && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${daysLeft < 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                {daysLeft < 0
                  ? `⚠ This lease expired ${Math.abs(daysLeft)} days ago — End, Terminate, or Renew it`
                  : `⚠ Expires in ${daysLeft} days — consider renewing`}
                <button onClick={() => { setTab('actions'); setAction('renew') }} className="ml-2 underline font-bold">Renew →</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PAYMENTS ── */}
        {tab === 'payments' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{payments.length} Payments Recorded</p>
                <p className="text-xs text-slate-400">Total: <span className="font-bold text-teal-600">${totalPaid.toLocaleString()}</span></p>
              </div>
              {lease.status === 'active' && (
                <Button size="sm" onClick={() => { setTab('actions'); setAction('payment') }}
                  className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Record Payment
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500">No payments recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {payments.map((p: any, i: number) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 capitalize">{p.method?.replace('_', ' ') ?? 'Cash'}{p.reference ? ` · ${p.reference}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-slate-400">{format(new Date(p.payment_date), 'MMMM yyyy')}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── ACTIONS ── */}
        {tab === 'actions' && (
          <div className="space-y-3">
            {/* Action menu */}
            {action === null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-2"
              >
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Available Actions</p>
                {lease.status === 'active' ? [
                  { a: 'payment' as Action,   icon: CreditCard,   bg: 'bg-teal-100',        ic: 'text-teal-600',   hov: 'hover:border-teal-200 hover:bg-teal-50',   title: 'Record Rent Payment',   desc: `Log a payment of $${Number(lease.rent_amount).toLocaleString()} or custom amount` },
                  { a: 'extend' as Action,    icon: CalendarDays, bg: 'bg-[#1B3B6F]/10',    ic: 'text-[#1B3B6F]', hov: 'hover:border-[#1B3B6F]/20 hover:bg-[#1B3B6F]/5', title: 'Extend Lease', desc: 'Push the end date forward, optionally adjust rent' },
                  { a: 'renew' as Action,     icon: RefreshCw,    bg: 'bg-teal-100',        ic: 'text-teal-600',   hov: 'hover:border-teal-200 hover:bg-teal-50',   title: 'Renew Lease',           desc: 'End current lease and create a new one' },
                  { a: 'end' as Action,       icon: CheckCircle2, bg: 'bg-amber-100',       ic: 'text-amber-600',  hov: 'hover:border-amber-200 hover:bg-amber-50', title: 'End Lease',             desc: 'Tenant leaving normally — marks ended, unit vacant' },
                  { a: 'terminate' as Action, icon: XCircle,      bg: 'bg-red-100',         ic: 'text-red-600',    hov: 'hover:border-red-200 hover:bg-red-50',     title: 'Terminate Lease',       desc: 'Eviction or forced termination' },
                ].map(item => (
                  <button key={item.title} onClick={() => setAction(item.a)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 ${item.hov} transition-all text-left`}>
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.icon className={`h-4 w-4 ${item.ic}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </button>
                )) : (
                  <p className="text-sm text-slate-400 text-center py-6">This lease is {lease.status} — no actions available.</p>
                )}
              </motion.div>
            )}

            {/* Record Payment */}
            {action === 'payment' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setAction(null)} className="p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="h-4 w-4 text-slate-400" /></button>
                  <p className="text-sm font-semibold text-slate-900">Record Rent Payment</p>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-700">
                  {displayName} · {unit?.unit_code} · Expected ${Number(lease.rent_amount).toLocaleString()}/mo
                  {sc > 0 && ` + $${sc.toLocaleString()} SC`}
                  {payments.length > 0 && ` · Last paid ${format(new Date(payments[0].payment_date), 'MMM d, yyyy')}`}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Amount *</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className={`${IC} pl-6`} /></div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Date *</Label>
                    <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} className={IC} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Method</Label>
                    <Select value={payForm.method} onValueChange={(v) => { if (v) setPayForm(p => ({ ...p, method: v })) }}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Reference <span className="font-normal text-slate-400 normal-case">(optional)</span>
                    </Label>
                    <Input placeholder="e.g. TXN123" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} className={IC} />
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
                  <Button onClick={handlePayment} disabled={saving} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Record Payment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Extend */}
            {action === 'extend' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setAction(null)} className="p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="h-4 w-4 text-slate-400" /></button>
                  <p className="text-sm font-semibold text-slate-900">Extend Lease</p>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">New End Date *</Label>
                  <Input type="date" value={extendForm.new_end_date} onChange={e => setExtendForm(p => ({ ...p, new_end_date: e.target.value }))} className={IC} />
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <button onClick={() => setExtendForm(p => ({ ...p, no_rent_change: !p.no_rent_change }))}
                    className={`w-10 h-5 rounded-full transition-all flex-shrink-0 relative ${extendForm.no_rent_change ? 'bg-teal-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${extendForm.no_rent_change ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">No Rent Change</p>
                    <p className="text-xs text-slate-400">Keep at ${Number(lease.rent_amount).toLocaleString()}/mo</p>
                  </div>
                </div>
                {!extendForm.no_rent_change && (
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">New Rent Amount</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <Input type="number" value={extendForm.new_rent} onChange={e => setExtendForm(p => ({ ...p, new_rent: e.target.value }))} className={`${IC} pl-6`} /></div>
                  </div>
                )}
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
                  <Button onClick={handleExtend} disabled={saving} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Extend Lease'}
                  </Button>
                </div>
              </div>
            )}

            {/* Renew */}
            {action === 'renew' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setAction(null)} className="p-1 rounded-lg hover:bg-slate-100"><ArrowLeft className="h-4 w-4 text-slate-400" /></button>
                  <p className="text-sm font-semibold text-slate-900">Renew Lease</p>
                </div>
                <div className="bg-[#1B3B6F]/5 border border-[#1B3B6F]/15 rounded-xl p-3 text-xs text-[#1B3B6F]">
                  Current lease will be marked as ended. A new lease will be created for {displayName} on {unit?.unit_code}.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">New Rent *</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <Input type="number" value={renewForm.rent_amount} onChange={e => setRenewForm(p => ({ ...p, rent_amount: e.target.value }))} className={`${IC} pl-6`} /></div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date *</Label>
                    <Input type="date" value={renewForm.lease_start} onChange={e => setRenewForm(p => ({ ...p, lease_start: e.target.value }))} className={IC} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      End Date <span className="font-normal text-slate-400 normal-case">(opt.)</span>
                    </Label>
                    <Input type="date" value={renewForm.lease_end} onChange={e => setRenewForm(p => ({ ...p, lease_end: e.target.value }))} className={IC} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Renewal Date <span className="font-normal text-slate-400 normal-case">(opt.)</span>
                    </Label>
                    <Input type="date" value={renewForm.renewal_date} onChange={e => setRenewForm(p => ({ ...p, renewal_date: e.target.value }))} className={IC} />
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-xl border-slate-200 px-4">Back</Button>
                  <Button onClick={handleRenew} disabled={saving} className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Renewing…</> : 'Confirm Renewal'}
                  </Button>
                </div>
              </div>
            )}

            {/* End / Terminate */}
            {(action === 'end' || action === 'terminate') && (
              <div className={`rounded-2xl border p-5 space-y-3 ${action === 'end' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {action === 'end' ? <CheckCircle2 className="h-5 w-5 text-amber-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <p className={`text-sm font-bold ${action === 'end' ? 'text-amber-800' : 'text-red-800'}`}>
                    {action === 'end' ? 'End Lease?' : 'Terminate Lease?'}
                  </p>
                </div>
                <p className={`text-xs ${action === 'end' ? 'text-amber-700' : 'text-red-600'}`}>
                  {action === 'end'
                    ? 'Marks lease as ended and sets unit to vacant. Use when tenant is leaving normally.'
                    : 'Marks lease as terminated and sets unit to vacant. Use for evictions or forced terminations.'}
                </p>
                <div className={`px-3 py-2 rounded-xl ${action === 'end' ? 'bg-amber-100' : 'bg-red-100'}`}>
                  <p className={`text-xs font-semibold ${action === 'end' ? 'text-amber-700' : 'text-red-700'}`}>
                    {displayName} · {unit?.unit_code} · {building?.name} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                  </p>
                </div>
                {error && <div className="bg-white border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
                  <Button onClick={action === 'end' ? handleEnd : handleTerminate} disabled={saving}
                    className={`h-9 text-white text-sm rounded-xl px-5 font-semibold shadow-sm ${action === 'end' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</> : action === 'end' ? 'Yes, End Lease' : 'Yes, Terminate'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
