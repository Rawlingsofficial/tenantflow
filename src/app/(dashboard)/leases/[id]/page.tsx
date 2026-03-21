'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, User, Home, MapPin, CreditCard, CheckCircle2,
  RefreshCw, XCircle, Pencil, Plus, CalendarDays, Loader2,
  FileText, TrendingUp, Clock
} from 'lucide-react'
import { format, differenceInDays, differenceInMonths } from 'date-fns'

function val<T>(v: T): never { return v as never }

type Tab = 'overview' | 'payments' | 'actions'
type Action = null | 'extend' | 'renew' | 'end' | 'terminate' | 'payment'

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [lease, setLease] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [action, setAction] = useState<Action>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
  const [extendForm, setExtendForm] = useState({ new_end_date: '', no_rent_change: true, new_rent: '' })
  const [renewForm, setRenewForm] = useState({ rent_amount: '', lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })

  useEffect(() => { if (id) loadLease() }, [id])

  async function loadLease() {
    setLoading(true)
    const { data } = await supabase
      .from('leases')
      .select(`*, tenants(id, first_name, last_name, primary_phone, email, photo_url, occupation),
        units(id, unit_code, unit_type, bedrooms, bathrooms, default_rent, building_id,
          buildings(id, name, address)),
        rent_payments(id, amount, payment_date, method, reference, status)`)
      .eq('id', id).single()
    const lease = data as any
    setLease(lease)
    if (lease) {
      setPayForm(p => ({ ...p, amount: String(lease.rent_amount) }))
      setExtendForm(p => ({ ...p, new_end_date: lease.lease_end ?? '', new_rent: String(lease.rent_amount) }))
      setRenewForm(p => ({ ...p, rent_amount: String(lease.rent_amount) }))
    }
    setLoading(false)
  }

  async function handlePayment() {
    if (!payForm.amount) { setError('Amount required'); return }
    setSaving(true); setError('')
    try {
      const { error: e } = await supabase.from('rent_payments').insert(val({
        lease_id: id, amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date, method: payForm.method,
        reference: payForm.reference || null, status: 'completed'
      }))
      if (e) throw e
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleExtend() {
    if (!extendForm.new_end_date) { setError('New end date required'); return }
    setSaving(true); setError('')
    try {
      const newRent = extendForm.no_rent_change ? lease.rent_amount : parseFloat(extendForm.new_rent)
      const { error: e } = await supabase.from('leases').update(val({ lease_end: extendForm.new_end_date, rent_amount: newRent })).eq('id', id)
      if (e) throw e
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
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
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleEnd() {
    setSaving(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended', lease_end: new Date().toISOString().split('T')[0] })).eq('id', id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleTerminate() {
    setSaving(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'terminated' })).eq('id', id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      await loadLease(); setAction(null)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    </div>
  )

  if (!lease) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Lease not found.</p>
        <Button variant="outline" className="mt-3" onClick={() => router.push('/leases')}>Back to Leases</Button>
      </div>
    </div>
  )

  const tenant = lease.tenants
  const unit = lease.units
  const building = unit?.buildings
  const tenantName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
  const initials = `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()
  const payments = (lease.rent_payments ?? []).filter((p: any) => p.status === 'completed')
    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const daysLeft = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
  const monthsActive = differenceInMonths(new Date(), new Date(lease.lease_start))
  const thisMonth = format(new Date(), 'yyyy-MM')
  const paidThisMonth = payments.some((p: any) => p.payment_date?.startsWith(thisMonth))
  const defaultRent = unit?.default_rent
  const rentDiff = defaultRent ? Number(lease.rent_amount) - Number(defaultRent) : 0

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      {/* Back + Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leases')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Leases
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">{tenantName}</span>
        </div>
        {lease.status === 'active' && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setTab('actions'); setAction('payment') }}
              className="h-8 text-xs rounded-lg gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </Button>
            <Button size="sm" onClick={() => { setTab('actions'); setAction('extend') }}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit Lease
            </Button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="px-6 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-100 flex-shrink-0">
                  {tenant?.photo_url
                    ? <img src={tenant.photo_url} alt={tenantName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-emerald-700">{initials}</div>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-gray-900">{tenantName}</h1>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      lease.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      lease.status === 'terminated' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>{lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}</span>
                    {!paidThisMonth && lease.status === 'active' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Unpaid this month</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{tenant?.occupation ?? 'No occupation'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Home className="h-3 w-3" /> {unit?.unit_code} · {building?.name}
                    </span>
                    {building?.address && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {building.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => router.push(`/tenants/${lease.tenant_id}`)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> View tenant profile
              </button>
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-50">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">${Number(lease.rent_amount).toLocaleString()}</p>
                {defaultRent && rentDiff !== 0 && (
                  <p className={`text-[10px] font-semibold mt-0.5 ${rentDiff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {rentDiff > 0 ? '+' : ''}${rentDiff.toLocaleString()} vs default
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">${totalPaid.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{payments.length} payments</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Tenancy</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{monthsActive}mo</p>
                <p className="text-[10px] text-gray-400 mt-0.5">since {format(new Date(lease.lease_start), 'MMM yyyy')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Lease End</p>
                {daysLeft !== null ? (
                  <>
                    <p className={`text-xl font-bold mt-0.5 ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{daysLeft < 0 ? 'overdue' : 'remaining'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">Open</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">no end date</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-1 border-b border-gray-200 mb-0">
        {(['overview', 'payments', 'actions'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setAction(null); setError('') }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
            {t === 'payments' && payments.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{payments.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4">
        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {/* Lease dates */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Lease Terms</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Start Date', value: format(new Date(lease.lease_start), 'MMMM d, yyyy') },
                  { label: 'End Date', value: lease.lease_end ? format(new Date(lease.lease_end), 'MMMM d, yyyy') : 'Open-ended' },
                  { label: 'Renewal Date', value: lease.renewal_date ? format(new Date(lease.renewal_date), 'MMMM d, yyyy') : '—' },
                  { label: 'Payment Due', value: `${format(new Date(lease.lease_start), 'do')} of every month` },
                ].map(row => (
                  <div key={row.label} className="py-2 border-b border-gray-50 last:border-0">
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Rent comparison */}
            {defaultRent && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rent Analysis</p>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Unit Default Rent</p>
                    <p className="text-lg font-bold text-gray-600">${Number(defaultRent).toLocaleString()}/mo</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    rentDiff > 0 ? 'bg-emerald-100 text-emerald-700' :
                    rentDiff < 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {rentDiff === 0 ? 'At default' : rentDiff > 0 ? `+$${rentDiff.toLocaleString()} above default` : `-$${Math.abs(rentDiff).toLocaleString()} below default`}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Agreed Rent</p>
                    <p className="text-lg font-bold text-gray-900">${Number(lease.rent_amount).toLocaleString()}/mo</p>
                  </div>
                </div>
              </div>
            )}
            {/* Status alert */}
            {daysLeft !== null && daysLeft <= 30 && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                daysLeft < 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                {daysLeft < 0
                  ? `⚠ This lease expired ${Math.abs(daysLeft)} days ago — End, Terminate, or Renew it`
                  : `⚠ Expires in ${daysLeft} days — consider renewing`}
                <button onClick={() => { setTab('actions'); setAction('renew') }}
                  className="ml-2 underline">Renew now →</button>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {tab === 'payments' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{payments.length} Payments Recorded</p>
                <p className="text-xs text-gray-400">Total collected: <span className="font-semibold text-emerald-600">${totalPaid.toLocaleString()}</span></p>
              </div>
              {lease.status === 'active' && (
                <Button size="sm" onClick={() => { setTab('actions'); setAction('payment') }}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Record Payment
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No payments recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">${Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 capitalize">{p.method?.replace('_', ' ') ?? 'Cash'}{p.reference ? ` · ${p.reference}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-gray-400">{format(new Date(p.payment_date), 'MMMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        {tab === 'actions' && (
          <div className="space-y-3">
            {/* Action selector when no action chosen */}
            {action === null && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Available Actions</p>
                {lease.status === 'active' && <>
                  <button onClick={() => setAction('payment')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Record Rent Payment</p>
                      <p className="text-xs text-gray-400">Log a payment of ${Number(lease.rent_amount).toLocaleString()} or custom amount</p>
                    </div>
                  </button>
                  <button onClick={() => setAction('extend')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Extend Lease</p>
                      <p className="text-xs text-gray-400">Push the end date forward, optionally adjust rent</p>
                    </div>
                  </button>
                  <button onClick={() => setAction('renew')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Renew Lease</p>
                      <p className="text-xs text-gray-400">End current lease and create a new one (same tenant + unit)</p>
                    </div>
                  </button>
                  <button onClick={() => setAction('end')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">End Lease</p>
                      <p className="text-xs text-gray-400">Tenant leaving normally — marks lease ended, unit vacant</p>
                    </div>
                  </button>
                  <button onClick={() => setAction('terminate')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all text-left">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Terminate Lease</p>
                      <p className="text-xs text-gray-400">Eviction or forced termination — marks terminated, unit vacant</p>
                    </div>
                  </button>
                </>}
                {lease.status !== 'active' && (
                  <p className="text-sm text-gray-400 text-center py-6">This lease is {lease.status} — no actions available.</p>
                )}
              </div>
            )}

            {/* Record Payment form */}
            {action === 'payment' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAction(null)} className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-4 w-4 text-gray-400" /></button>
                  <p className="text-sm font-semibold text-gray-900">Record Rent Payment</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
                  {tenantName} · {unit?.unit_code} · Expected ${Number(lease.rent_amount).toLocaleString()}/mo
                  {payments.length > 0 && ` · Last paid ${format(new Date(payments[0].payment_date), 'MMM d, yyyy')}`}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount *</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200 pl-6" /></div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Date *</Label>
                    <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Method</Label>
                    <Select value={payForm.method}
                      // @ts-ignore
                      onValueChange={(v: string) => setPayForm(p => ({ ...p, method: v }))}>
                      <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200"><SelectValue /></SelectTrigger>
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
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Reference <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input placeholder="e.g. TXN123" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
                  <Button onClick={handlePayment} disabled={saving} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Record Payment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Extend form */}
            {action === 'extend' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAction(null)} className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-4 w-4 text-gray-400" /></button>
                  <p className="text-sm font-semibold text-gray-900">Extend Lease</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New End Date *</Label>
                  <Input type="date" value={extendForm.new_end_date} onChange={e => setExtendForm(p => ({ ...p, new_end_date: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <button onClick={() => setExtendForm(p => ({ ...p, no_rent_change: !p.no_rent_change }))}
                    className={`w-10 h-5 rounded-full transition-all flex-shrink-0 relative ${extendForm.no_rent_change ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${extendForm.no_rent_change ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">No Rent Change</p>
                    <p className="text-xs text-gray-400">Keep at ${Number(lease.rent_amount).toLocaleString()}/mo</p>
                  </div>
                </div>
                {!extendForm.no_rent_change && (
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Rent Amount</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <Input type="number" value={extendForm.new_rent} onChange={e => setExtendForm(p => ({ ...p, new_rent: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200 pl-6" /></div>
                  </div>
                )}
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
                  <Button onClick={handleExtend} disabled={saving} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Extend Lease'}
                  </Button>
                </div>
              </div>
            )}

            {/* Renew form */}
            {action === 'renew' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAction(null)} className="p-1 rounded hover:bg-gray-100"><ArrowLeft className="h-4 w-4 text-gray-400" /></button>
                  <p className="text-sm font-semibold text-gray-900">Renew Lease</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  Current lease will be marked as ended. A new lease will be created for {tenantName} on {unit?.unit_code}.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Rent *</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <Input type="number" value={renewForm.rent_amount} onChange={e => setRenewForm(p => ({ ...p, rent_amount: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200 pl-6" /></div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date *</Label>
                    <Input type="date" value={renewForm.lease_start} onChange={e => setRenewForm(p => ({ ...p, lease_start: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">End Date <span className="text-gray-400 font-normal">(opt.)</span></Label>
                    <Input type="date" value={renewForm.lease_end} onChange={e => setRenewForm(p => ({ ...p, lease_end: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Renewal Date <span className="text-gray-400 font-normal">(opt.)</span></Label>
                    <Input type="date" value={renewForm.renewal_date} onChange={e => setRenewForm(p => ({ ...p, renewal_date: e.target.value }))} className="h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
                  <Button onClick={handleRenew} disabled={saving} className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg px-5">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Renewing...</> : 'Confirm Renewal'}
                  </Button>
                </div>
              </div>
            )}

            {/* End / Terminate confirmations */}
            {(action === 'end' || action === 'terminate') && (
              <div className={`rounded-xl border p-5 space-y-3 ${action === 'end' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
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
                <div className={`px-3 py-2 rounded-lg ${action === 'end' ? 'bg-amber-100' : 'bg-red-100'}`}>
                  <p className={`text-xs font-medium ${action === 'end' ? 'text-amber-700' : 'text-red-700'}`}>
                    {tenantName} · {unit?.unit_code} · {building?.name} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                  </p>
                </div>
                {error && <div className="bg-white border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setAction(null)} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
                  <Button onClick={action === 'end' ? handleEnd : handleTerminate} disabled={saving}
                    className={`h-9 text-white text-sm rounded-lg px-5 ${action === 'end' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : action === 'end' ? 'Yes, End Lease' : 'Yes, Terminate'}
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
