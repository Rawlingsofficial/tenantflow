'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Loader2, User, CreditCard, Plus, X, ArrowLeft,
  Pencil, CheckCircle2, RefreshCw, XCircle,
  CalendarDays, ClipboardList, FileText, DollarSign, Receipt
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, differenceInDays } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { LeaseWithDetails, RentPayment } from '@/types'

interface LeaseWithPayments extends LeaseWithDetails {
  rent_payments?: RentPayment[]
}
interface Props {
  open: boolean
  onClose: () => void
  lease: LeaseWithPayments | null
  organizationId: string
  onUpdated: () => void
}
type Action = null | 'terminate' | 'renew' | 'end' | 'payment' | 'extend'
type Tab    = 'overview' | 'payments' | 'file'
function val<T>(v: T): never { return v as never }

const IC = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

export default function LeaseDetailDialog({ open, onClose, lease, organizationId, onUpdated }: Props) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [action, setAction] = useState<Action>(null)
  const [tab, setTab]       = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const [renewForm,  setRenewForm]  = useState({ rent_amount: '', lease_start: '', lease_end: '', renewal_date: '' })
  const [extendForm, setExtendForm] = useState({ new_end_date: '', rent_amount: '', no_rent_change: true })
  const [payForm,    setPayForm]    = useState<{ amount: string; payment_date: string; method: string; reference: string }>({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })

  function reset()       { setAction(null); setError('') }
  function handleClose() { reset(); setTab('overview'); onClose() }

  async function handleTerminate() {
    if (!lease) return
    setLoading(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'terminated' })).eq('id', lease.id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      onUpdated(); handleClose()
    } catch (e: any) { setError(e.message ?? 'Failed') } finally { setLoading(false) }
  }
  async function handleEnd() {
    if (!lease) return
    setLoading(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended', lease_end: new Date().toISOString().split('T')[0] })).eq('id', lease.id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      onUpdated(); handleClose()
    } catch (e: any) { setError(e.message ?? 'Failed') } finally { setLoading(false) }
  }
  async function handleExtend() {
    if (!lease) return
    if (!extendForm.new_end_date) { setError('New end date is required'); return }
    setLoading(true); setError('')
    try {
      const rent = extendForm.no_rent_change ? lease.rent_amount : parseFloat(extendForm.rent_amount)
      await supabase.from('leases').update(val({ lease_end: extendForm.new_end_date, rent_amount: rent })).eq('id', lease.id)
      onUpdated(); handleClose()
    } catch (e: any) { setError(e.message ?? 'Failed') } finally { setLoading(false) }
  }
  async function handleRenew() {
    if (!lease) return
    if (!renewForm.rent_amount || !renewForm.lease_start) { setError('Rent amount and start date required'); return }
    setLoading(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended' })).eq('id', lease.id)
      await supabase.from('leases').insert(val({
        organization_id: organizationId, tenant_id: lease.tenant_id, unit_id: lease.unit_id,
        rent_amount: parseFloat(renewForm.rent_amount), lease_start: renewForm.lease_start,
        lease_end: renewForm.lease_end || null, renewal_date: renewForm.renewal_date || null, status: 'active',
      }))
      onUpdated(); handleClose()
    } catch (e: any) { setError(e.message ?? 'Failed') } finally { setLoading(false) }
  }
  async function handlePayment() {
    if (!lease) return
    if (!payForm.amount || !payForm.payment_date) { setError('Amount and date required'); return }
    setLoading(true); setError('')
    try {
      await supabase.from('rent_payments').insert(val({
        lease_id: lease.id, amount: parseFloat(payForm.amount),
        payment_date: payForm.payment_date, method: payForm.method || null,
        reference: payForm.reference.trim() || null, status: 'completed',
      }))
      onUpdated(); handleClose()
    } catch (e: any) { setError(e.message ?? 'Failed') } finally { setLoading(false) }
  }

  function handlePrint() {
    if (!lease) return
    const t = (lease as any).tenants
    const u = (lease as any).units
    const isCompany = t?.tenant_type === 'company'
    const name = isCompany ? (t?.company_name ?? 'Company') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Lease Summary · TenantFlow</title>
      <style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:600px;color:#1e293b}
      h2{color:#1B3B6F;border-bottom:2px solid #14b8a6;padding-bottom:.5rem}
      .row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f1f5f9}
      .label{color:#64748b;font-size:.875rem}.value{font-weight:600;color:#1e293b}
      .footer{margin-top:2rem;font-size:.75rem;color:#94a3b8}</style></head>
      <body><h2>Lease Summary — TenantFlow</h2>
      <div class="row"><span class="label">${isCompany ? 'Company' : 'Tenant'}</span><span class="value">${name}</span></div>
      <div class="row"><span class="label">Unit</span><span class="value">${u?.unit_code ?? '—'}</span></div>
      <div class="row"><span class="label">Building</span><span class="value">${u?.buildings?.name ?? '—'}</span></div>
      <div class="row"><span class="label">Rent</span><span class="value">$${Number(lease.rent_amount).toLocaleString()}/mo</span></div>
      ${Number((lease as any).service_charge ?? 0) > 0 ? `<div class="row"><span class="label">Service Charge</span><span class="value">$${Number((lease as any).service_charge).toLocaleString()}/mo</span></div>` : ''}
      <div class="row"><span class="label">Started</span><span class="value">${format(new Date(lease.lease_start), 'dd MMM yyyy')}</span></div>
      <div class="row"><span class="label">Ends</span><span class="value">${lease.lease_end ? format(new Date(lease.lease_end), 'dd MMM yyyy') : 'Open ended'}</span></div>
      <div class="row"><span class="label">Status</span><span class="value">${lease.status.toUpperCase()}</span></div>
      <div class="footer">Generated ${format(new Date(), 'dd MMM yyyy HH:mm')} · TenantFlow</div>
      </body></html>`)
    win.document.close(); win.print()
  }

  if (!lease) return null

  const tenant   = (lease as any).tenants
  const unit     = (lease as any).units
  const isCompany  = tenant?.tenant_type === 'company'
  const isCommercialUnit = unit?.buildings?.building_type === 'commercial'
  const displayName = isCompany
    ? (tenant?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim())
    : `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
  const initial = isCompany
    ? (tenant?.company_name ?? 'C')[0].toUpperCase()
    : `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()

  const daysLeft  = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
  const payments  = (lease.rent_payments ?? []).filter(p => p.status === 'completed')
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const sc        = Number((lease as any).service_charge ?? 0)
  const escalation = (lease as any).escalation_rate

  const statusStyle: Record<string, string> = {
    active:     'bg-teal-50 text-teal-700 border border-teal-200',
    ended:      'bg-slate-100 text-slate-500 border border-slate-200',
    terminated: 'bg-red-50 text-red-600 border border-red-200',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="relative px-5 pt-5 pb-0 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1B3B6F]/4 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {action !== null && (
                <button onClick={reset} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0 overflow-hidden">
                  {tenant?.photo_url
                    ? <img src={tenant.photo_url} alt={displayName} className="w-full h-full object-cover" />
                    : (initial || '?')}
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-slate-900 leading-tight">{displayName}</DialogTitle>
                  <p className="text-xs text-slate-400">
                    {action === null         ? (isCommercialUnit ? 'Commercial Lease' : 'Lease Details') :
                     action === 'payment'    ? 'Record Payment'  :
                     action === 'extend'     ? 'Extend Lease'    :
                     action === 'renew'      ? 'Renew Lease'     :
                     action === 'end'        ? 'End Lease'       : 'Terminate Lease'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          {action === null && (
            <div className="flex items-center gap-0.5 border-b border-slate-100">
              {(['overview', 'payments', 'file'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                    tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  {t}
                  {t === 'payments' && payments.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">{payments.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── OVERVIEW ── */}
          {action === null && tab === 'overview' && (
            <>
              {/* Summary card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyle[lease.status] ?? statusStyle.ended}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${lease.status === 'active' ? 'bg-teal-500 animate-pulse' : lease.status === 'terminated' ? 'bg-red-500' : 'bg-slate-400'}`} />
                      {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(lease.lease_start), 'MMM d, yyyy')} – {lease.lease_end ? format(new Date(lease.lease_end), 'MMM d, yyyy') : 'Open ended'}
                    </span>
                  </div>
                  <button
                    onClick={() => { setExtendForm({ new_end_date: lease.lease_end ?? '', rent_amount: String(lease.rent_amount), no_rent_change: true }); setAction('extend') }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>

                <p className="text-2xl font-bold text-slate-900 mb-4">
                  {format(new Date(lease.lease_start), 'MMM d')}
                  {' – '}
                  {lease.lease_end
                    ? <>{format(new Date(lease.lease_end), 'MMM d')}{' '}<span className="text-lg font-semibold text-slate-500">{new Date(lease.lease_end).getFullYear()}</span></>
                    : <span className="text-lg font-semibold text-slate-400">Open-ended</span>}
                </p>

                {/* Metrics — show SC column for commercial */}
                <div className={`grid gap-3 ${sc > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rent</p>
                    <p className="text-base font-bold text-slate-900 tabular-nums">${Number(lease.rent_amount).toLocaleString()}</p>
                  </div>
                  {sc > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">S/Charge</p>
                      <p className="text-base font-bold text-slate-900 tabular-nums">${sc.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</p>
                    <p className="text-base font-bold text-slate-900 font-mono">{unit?.unit_code ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Last Pay</p>
                    <p className="text-base font-bold text-slate-900">
                      {payments.length > 0 ? `${differenceInDays(new Date(), new Date(payments[0].payment_date))}d ago` : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
                    <p className="text-base font-bold text-teal-600 tabular-nums">${totalPaid.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Commercial extras */}
              {isCommercialUnit && escalation && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1B3B6F]/5 border border-[#1B3B6F]/15 rounded-xl">
                  <DollarSign className="h-4 w-4 text-[#1B3B6F] shrink-0" />
                  <p className="text-sm font-medium text-[#1B3B6F]">{escalation}% annual escalation rate</p>
                </div>
              )}

              {/* Days remaining alert */}
              {daysLeft !== null && (
                <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  daysLeft < 0  ? 'bg-red-50 border border-red-200 text-red-700' :
                  daysLeft <= 30 ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                                   'bg-teal-50 border border-teal-200 text-teal-700'
                }`}>
                  <span>
                    {daysLeft < 0   ? `⚠ Lease expired ${Math.abs(daysLeft)} days ago` :
                     daysLeft <= 30 ? `⚠ Expires in ${daysLeft} days` :
                                      `✓ ${daysLeft} days remaining`}
                  </span>
                  {daysLeft <= 30 && (
                    <button onClick={() => {
                      setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })
                      setAction('renew')
                    }} className="underline">Renew now</button>
                  )}
                </div>
              )}

              {/* Quick action dropdown */}
              {lease.status === 'active' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Active
                  </span>
                  <select
                    className="flex-1 h-8 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                    defaultValue=""
                    onChange={e => {
                      const v = e.target.value
                      if (v === 'extend')    { setExtendForm({ new_end_date: lease.lease_end ?? '', rent_amount: String(lease.rent_amount), no_rent_change: true }); setAction('extend') }
                      if (v === 'renew')     { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }
                      if (v === 'end')       setAction('end')
                      if (v === 'terminate') setAction('terminate')
                      e.target.value = ''
                    }}>
                    <option value="" disabled>Quick action…</option>
                    <option value="extend">Extend lease</option>
                    <option value="renew">Renew lease</option>
                    <option value="end">End lease</option>
                    <option value="terminate">Terminate lease</option>
                  </select>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                {lease.status === 'active' && (
                  <Button className="w-full justify-start gap-2.5 h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
                    onClick={() => {
                      setPayForm({ amount: String(lease.rent_amount), payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
                      setAction('payment')
                    }}>
                    <CreditCard className="h-4 w-4" /> Record Rent Payment
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl border-slate-200"
                    onClick={() => router.push(`/tenants/${lease.tenant_id}`)}>
                    <User className="h-3.5 w-3.5 text-slate-400" /> View {isCompany ? 'Company' : 'Tenant'}
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl border-slate-200" onClick={handlePrint}>
                    <ClipboardList className="h-3.5 w-3.5 text-slate-400" /> Print Summary
                  </Button>
                </div>
                {lease.status === 'active' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }}
                      className="justify-start gap-2 h-9 text-sm rounded-xl border-[#1B3B6F]/20 text-[#1B3B6F] hover:bg-[#1B3B6F]/5">
                      <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </Button>
                    <Button variant="outline" onClick={() => setAction('end')}
                      className="justify-start gap-2 h-9 text-sm rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> End Lease
                    </Button>
                  </div>
                )}
                {lease.status === 'active' && (
                  <Button variant="outline" onClick={() => setAction('terminate')}
                    className="w-full justify-start gap-2 h-9 text-sm rounded-xl border-red-200 text-red-500 hover:bg-red-50">
                    <XCircle className="h-3.5 w-3.5" /> Terminate Lease
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ── PAYMENTS TAB ── */}
          {action === null && tab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{payments.length} payments</p>
                  <p className="text-xs text-slate-400">Total: <span className="font-bold text-teal-600">${totalPaid.toLocaleString()}</span></p>
                </div>
                {lease.status === 'active' && (
                  <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl gap-1.5 shadow-sm"
                    onClick={() => { setPayForm({ amount: String(lease.rent_amount), payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' }); setAction('payment') }}>
                    <Plus className="h-3.5 w-3.5" /> Record Payment
                  </Button>
                )}
              </div>
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 tabular-nums">${Number(p.amount).toLocaleString()}</p>
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
            </div>
          )}

          {/* ── FILE TAB ── */}
          {action === null && tab === 'file' && (
            <div className="text-center py-12">
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No files attached</p>
              <p className="text-xs text-slate-400 mt-1">Upload lease agreements and documents</p>
              <Button size="sm" variant="outline" className="mt-4 text-xs h-8 rounded-xl border-slate-200">Upload File</Button>
            </div>
          )}

          {/* ── RECORD PAYMENT ── */}
          {action === 'payment' && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-teal-800">{displayName} · Unit {unit?.unit_code}</p>
                <p className="text-xs text-teal-600 mt-0.5">
                  Monthly rent: <span className="font-bold">${Number(lease.rent_amount).toLocaleString()}</span>
                  {sc > 0 && ` + $${sc.toLocaleString()} SC`}
                </p>
                {payments.length > 0 && (
                  <p className="text-xs text-teal-600">Last payment: <span className="font-bold">{format(new Date(payments[0].payment_date), 'MMM d, yyyy')}</span></p>
                )}
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
                    Reference <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </Label>
                  <Input placeholder="e.g. TXN123" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} className={IC} />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── EXTEND ── */}
          {action === 'extend' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-sm text-slate-600">Extend lease for <strong>{displayName}</strong> in <strong>{unit?.unit_code}</strong></p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">New End Date *</Label>
                <div className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input type="date" value={extendForm.new_end_date} onChange={e => setExtendForm(p => ({ ...p, new_end_date: e.target.value }))} className={`${IC} pl-9`} /></div>
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
                    <Input type="number" value={extendForm.rent_amount} onChange={e => setExtendForm(p => ({ ...p, rent_amount: e.target.value }))} className={`${IC} pl-6`} /></div>
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── RENEW ── */}
          {action === 'renew' && (
            <div className="space-y-4">
              <div className="bg-[#1B3B6F]/5 border border-[#1B3B6F]/15 rounded-xl p-3">
                <p className="text-sm font-semibold text-[#1B3B6F]">Renewing lease for {displayName}</p>
                <p className="text-xs text-[#1B3B6F]/70 mt-0.5">Current lease will end and a new one created</p>
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
                    End Date <span className="text-slate-400 font-normal normal-case">(opt.)</span>
                  </Label>
                  <Input type="date" value={renewForm.lease_end} onChange={e => setRenewForm(p => ({ ...p, lease_end: e.target.value }))} className={IC} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Renewal Date <span className="text-slate-400 font-normal normal-case">(opt.)</span>
                  </Label>
                  <Input type="date" value={renewForm.renewal_date} onChange={e => setRenewForm(p => ({ ...p, renewal_date: e.target.value }))} className={IC} />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── TERMINATE ── */}
          {action === 'terminate' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /><p className="text-sm font-bold text-red-800">Terminate Lease?</p></div>
              <p className="text-xs text-red-600">Marks the lease as <strong>terminated</strong> and sets the unit to <strong>vacant</strong>.</p>
              <div className="bg-red-100 rounded-xl px-3 py-2">
                <p className="text-xs font-medium text-red-700">{displayName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
              {error && <div className="bg-white border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── END ── */}
          {action === 'end' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-amber-600" /><p className="text-sm font-bold text-amber-800">End Lease?</p></div>
              <p className="text-xs text-amber-700">Marks the lease as <strong>ended</strong> and sets the unit to <strong>vacant</strong>. Use when tenant is leaving normally.</p>
              <div className="bg-amber-100 rounded-xl px-3 py-2">
                <p className="text-xs font-medium text-amber-700">{displayName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
              {error && <div className="bg-white border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          {action === null     && <Button variant="outline" onClick={handleClose} className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">Close</Button>}
          {action === 'payment' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-xl border-slate-200 px-4">Back</Button>
            <Button onClick={handlePayment} disabled={loading} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Record Payment'}
            </Button>
          </>}
          {action === 'extend' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
            <Button onClick={handleExtend} disabled={loading} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Extend Lease'}
            </Button>
          </>}
          {action === 'renew' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-xl border-slate-200 px-4">Back</Button>
            <Button onClick={handleRenew} disabled={loading} className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Renewing…</> : 'Confirm Renewal'}
            </Button>
          </>}
          {action === 'terminate' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
            <Button onClick={handleTerminate} disabled={loading} className="h-9 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Terminating…</> : 'Yes, Terminate'}
            </Button>
          </>}
          {action === 'end' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-xl border-slate-200 px-4">Cancel</Button>
            <Button onClick={handleEnd} disabled={loading} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-xl px-5 font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ending…</> : 'Yes, End Lease'}
            </Button>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
