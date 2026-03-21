'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, User, Home, Calendar, DollarSign,
  RefreshCw, XCircle, CheckCircle2, Printer,
  CreditCard, Plus, X, ArrowLeft, Pencil,
  Clock, TrendingUp, Key, FileText, ChevronDown,
  AlertTriangle, MoreHorizontal, CalendarDays, ClipboardList
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, differenceInDays, differenceInMonths } from 'date-fns'
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
type Tab = 'overview' | 'payments' | 'file'

function val<T>(v: T): never { return v as never }

export default function LeaseDetailDialog({ open, onClose, lease, organizationId, onUpdated }: Props) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [action, setAction] = useState<Action>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [renewForm, setRenewForm] = useState({ rent_amount: '', lease_start: '', lease_end: '', renewal_date: '' })
  const [extendForm, setExtendForm] = useState({ new_end_date: '', rent_amount: '', no_rent_change: true })
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '',
  })

  function reset() { setAction(null); setError('') }
  function handleClose() { reset(); setTab('overview'); onClose() }

  async function handleTerminate() {
    if (!lease) return
    setLoading(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'terminated' })).eq('id', lease.id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      onUpdated(); handleClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleEndLease() {
    if (!lease) return
    setLoading(true); setError('')
    try {
      await supabase.from('leases').update(val({ status: 'ended', lease_end: new Date().toISOString().split('T')[0] })).eq('id', lease.id)
      await supabase.from('units').update(val({ status: 'vacant' })).eq('id', lease.unit_id)
      onUpdated(); handleClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleExtend() {
    if (!lease) return
    if (!extendForm.new_end_date) { setError('New end date is required'); return }
    setLoading(true); setError('')
    try {
      const newRent = extendForm.no_rent_change ? lease.rent_amount : parseFloat(extendForm.rent_amount)
      await supabase.from('leases').update(val({ lease_end: extendForm.new_end_date, rent_amount: newRent })).eq('id', lease.id)
      onUpdated(); handleClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
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
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleRecordPayment() {
    if (!lease) return
    if (!paymentForm.amount || !paymentForm.payment_date) { setError('Amount and date required'); return }
    setLoading(true); setError('')
    try {
      await supabase.from('rent_payments').insert(val({
        lease_id: lease.id, amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date, method: paymentForm.method || null,
        reference: paymentForm.reference.trim() || null, status: 'completed',
      }))
      onUpdated(); handleClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  function handlePrint() {
    if (!lease) return
    const t = (lease as any).tenants
    const u = (lease as any).units
    const tenantName = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<html><head><title>Lease Summary</title>
        <style>body{font-family:Arial,sans-serif;padding:2rem;max-width:600px;}
        h2{color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:.5rem;}
        .row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f1f5f9;}
        .label{color:#64748b;font-size:.875rem;}.value{font-weight:600;color:#1e293b;}
        .footer{margin-top:2rem;font-size:.75rem;color:#94a3b8;}</style></head>
        <body><h2>Lease Summary</h2>
        <div class="row"><span class="label">Tenant</span><span class="value">${tenantName}</span></div>
        <div class="row"><span class="label">Unit</span><span class="value">${u?.unit_code ?? '—'}</span></div>
        <div class="row"><span class="label">Building</span><span class="value">${u?.buildings?.name ?? '—'}</span></div>
        <div class="row"><span class="label">Rent</span><span class="value">$${Number(lease.rent_amount).toLocaleString()}/mo</span></div>
        <div class="row"><span class="label">Started</span><span class="value">${format(new Date(lease.lease_start), 'dd MMM yyyy')}</span></div>
        <div class="row"><span class="label">Ends</span><span class="value">${lease.lease_end ? format(new Date(lease.lease_end), 'dd MMM yyyy') : 'Open ended'}</span></div>
        <div class="row"><span class="label">Status</span><span class="value">${lease.status.toUpperCase()}</span></div>
        <div class="footer">Generated ${format(new Date(), 'dd MMM yyyy HH:mm')} · TenantFlow</div>
        </body></html>`)
      win.document.close(); win.print()
    }
  }

  if (!lease) return null

  const tenant = (lease as any).tenants
  const unit = (lease as any).units
  const tenantName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
  const initials = `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()
  const daysLeft = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
  const monthsActive = differenceInMonths(new Date(), new Date(lease.lease_start))
  const isOverdue = daysLeft !== null && daysLeft < 0
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
  const payments = lease.rent_payments ?? []
  const completedPayments = payments
    .filter(p => p.status === 'completed')
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid = completedPayments.reduce((s, p) => s + Number(p.amount), 0)
  const rentDueDay = format(new Date(lease.lease_start), 'do')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">

        {/* Header — matches "Sarah Lee · Lease Details" */}
        <div className="px-5 pt-5 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {action !== null && (
                <button onClick={reset} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 mr-1">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle className="text-lg font-bold text-gray-900">
                {tenantName}
                <span className="text-gray-400 font-normal text-base mx-2">:</span>
                <span className="text-gray-700 font-semibold text-base">
                  {action === null ? 'Lease Details' :
                   action === 'payment' ? 'Record Payment' :
                   action === 'extend' ? 'Extend Lease' :
                   action === 'renew' ? 'Renew Lease' :
                   action === 'end' ? 'End Lease' : 'Terminate Lease'}
                </span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">

              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {action === null && (
            <div className="flex items-center gap-1 border-b border-gray-100">
              {(['overview', 'payments', 'file'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                    tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t}
                  {t === 'payments' && completedPayments.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {completedPayments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── OVERVIEW TAB ── */}
          {action === null && tab === 'overview' && (
            <>
              {/* Status + date header card */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Tenant avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                      {tenant?.photo_url
                        ? <img src={tenant.photo_url} alt={tenantName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{initials}</div>}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      lease.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      lease.status === 'terminated' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {lease.status === 'active' ? 'Active' : lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(lease.lease_start), 'MMM d, yyyy')} –{' '}
                      {lease.lease_end ? format(new Date(lease.lease_end), 'MMM d, yyyy') : 'Open ended'}
                    </span>
                  </div>
                  <button onClick={() => {
                    setExtendForm({ new_end_date: lease.lease_end ?? '', rent_amount: String(lease.rent_amount), no_rent_change: true })
                    setAction('extend')
                  }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                    <Pencil className="h-3 w-3" /> Edit Lease
                  </button>
                </div>

                {/* Big date range */}
                <p className="text-2xl font-bold text-gray-900">
                  {format(new Date(lease.lease_start), 'MMM d')}
                  {' – '}
                  {lease.lease_end
                    ? <>{format(new Date(lease.lease_end), 'MMM d')}{' '}<span className="text-lg font-semibold text-gray-500">{new Date(lease.lease_end).getFullYear()}</span></>
                    : <span className="text-lg font-semibold text-gray-400">Open-ended</span>
                  }
                </p>

                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Monthly Rent</p>
                    <p className="text-lg font-bold text-gray-900">${Number(lease.rent_amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Unit</p>
                    <p className="text-lg font-bold text-gray-900">{unit?.unit_code ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Last Payment</p>
                    <p className="text-lg font-bold text-gray-900">
                      {completedPayments.length > 0
                        ? `${differenceInDays(new Date(), new Date(completedPayments[0].payment_date))}d ago`
                        : 'None yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Next Payment Due */}
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Next Payment Due</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {rentDueDay} of every month · <span className="text-emerald-600">${Number(lease.rent_amount).toLocaleString()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{completedPayments.length} payment{completedPayments.length !== 1 ? 's' : ''} recorded</p>
                  <p className="text-xs font-semibold text-emerald-600">${totalPaid.toLocaleString()} total</p>
                </div>
              </div>

              {/* Days remaining pill */}
              {daysLeft !== null && (
                <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  daysLeft < 0 ? 'bg-red-50 border border-red-200 text-red-700' :
                  daysLeft <= 30 ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                  'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}>
                  <span>
                    {daysLeft < 0
                      ? `⚠ Lease expired ${Math.abs(daysLeft)} days ago`
                      : daysLeft <= 30
                        ? `⚠ Expires in ${daysLeft} days — consider renewing`
                        : `✓ ${daysLeft} days remaining`}
                  </span>
                  {daysLeft <= 30 && (
                    <button onClick={() => { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }}
                      className="underline text-xs">
                      Renew now
                    </button>
                  )}
                </div>
              )}

              {/* Quick action selector */}
              {lease.status === 'active' && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                  <select
                    className="flex-1 h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'extend') { setExtendForm({ new_end_date: lease.lease_end ?? '', rent_amount: String(lease.rent_amount), no_rent_change: true }); setAction('extend') }
                      if (v === 'renew') { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }
                      if (v === 'end') setAction('end')
                      if (v === 'terminate') setAction('terminate')
                      e.target.value = ''
                    }}>
                    <option value="" disabled>Quick action...</option>
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
                  <Button className="w-full justify-start gap-2.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    onClick={() => {
                      setPaymentForm({ amount: String(lease.rent_amount), payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
                      setAction('payment')
                    }}>
                    <CreditCard className="h-4 w-4" /> Record Rent Payment
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl"
                    onClick={() => router.push(`/tenants/${lease.tenant_id}`)}>
                    <User className="h-3.5 w-3.5 text-gray-400" /> View Tenant
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl" onClick={handlePrint}>
                    <ClipboardList className="h-3.5 w-3.5 text-gray-400" /> Print Summary
                  </Button>
                </div>
                {lease.status === 'active' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                      onClick={() => { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }}>
                      <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                      onClick={() => setAction('end')}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> End Lease
                    </Button>
                  </div>
                )}
                {lease.status === 'active' && (
                  <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm rounded-xl text-red-500 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setAction('terminate')}>
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
                  <p className="text-sm font-semibold text-gray-800">{completedPayments.length} payments</p>
                  <p className="text-xs text-gray-400">Total: <span className="font-semibold text-emerald-600">${totalPaid.toLocaleString()}</span></p>
                </div>
                {lease.status === 'active' && (
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5"
                    onClick={() => { setPaymentForm({ amount: String(lease.rent_amount), payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' }); setAction('payment') }}>
                    <Plus className="h-3.5 w-3.5" /> Record Payment
                  </Button>
                )}
              </div>
              {completedPayments.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">${Number(p.amount).toLocaleString()}</p>
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

          {/* ── FILE TAB ── */}
          {action === null && tab === 'file' && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-gray-500">No files attached</p>
              <p className="text-xs text-gray-400 mt-1">Upload lease agreements and documents</p>
              <Button size="sm" variant="outline" className="mt-4 text-xs h-8 rounded-lg">Upload File</Button>
            </div>
          )}

          {/* ── RECORD PAYMENT ── */}
          {action === 'payment' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-emerald-800">{tenantName} · Unit {unit?.unit_code}</p>
                <p className="text-xs text-emerald-600">Monthly rent: <span className="font-semibold">${Number(lease.rent_amount).toLocaleString()}</span></p>
                {completedPayments.length > 0 && (
                  <p className="text-xs text-emerald-600">Last payment: <span className="font-semibold">{format(new Date(completedPayments[0].payment_date), 'MMM d, yyyy')}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <Input type="number" value={paymentForm.amount}
                      onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                      className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Date *</Label>
                  <Input type="date" value={paymentForm.payment_date}
                    onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Method</Label>
                  <Select value={paymentForm.method}
                    // @ts-ignore
                    onValueChange={(v: string) => setPaymentForm(p => ({ ...p, method: v }))}>
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
                  <Input placeholder="e.g. TXN123" value={paymentForm.reference}
                    onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── EXTEND LEASE — matches mockup exactly ── */}
          {action === 'extend' && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-sm text-gray-600">Extend The Lease for {tenantName} in Unit {unit?.unit_code}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment Until Lease</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input type="date" value={extendForm.new_end_date}
                    onChange={e => setExtendForm(p => ({ ...p, new_end_date: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200 pl-9" />
                </div>
              </div>
              {/* No Rent Change toggle — matches mockup */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <button onClick={() => setExtendForm(p => ({ ...p, no_rent_change: !p.no_rent_change }))}
                  className={`w-10 h-5 rounded-full transition-all flex-shrink-0 relative ${extendForm.no_rent_change ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${extendForm.no_rent_change ? 'left-5' : 'left-0.5'}`} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-800">No Rent Change</p>
                  <p className="text-xs text-gray-400">Keep rent at ${Number(lease.rent_amount).toLocaleString()}/mo</p>
                </div>
              </div>
              {/* Rent Amount row */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Rent Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <Input type="number"
                      value={extendForm.no_rent_change ? lease.rent_amount.toString() : extendForm.rent_amount}
                      disabled={extendForm.no_rent_change}
                      onChange={e => setExtendForm(p => ({ ...p, rent_amount: e.target.value }))}
                      className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-5">
                  <span className="text-sm font-semibold text-gray-600">$0</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 text-xs">✓</span>
                  </div>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── RENEW ── */}
          {action === 'renew' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800">Renewing lease for {tenantName}</p>
                <p className="text-xs text-blue-600 mt-0.5">Current lease will end and a new one created</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Rent *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <Input type="number" value={renewForm.rent_amount}
                      onChange={e => setRenewForm(p => ({ ...p, rent_amount: e.target.value }))}
                      className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date *</Label>
                  <Input type="date" value={renewForm.lease_start}
                    onChange={e => setRenewForm(p => ({ ...p, lease_start: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">End Date <span className="text-gray-400 font-normal">(opt.)</span></Label>
                  <Input type="date" value={renewForm.lease_end}
                    onChange={e => setRenewForm(p => ({ ...p, lease_end: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Renewal Date <span className="text-gray-400 font-normal">(opt.)</span></Label>
                  <Input type="date" value={renewForm.renewal_date}
                    onChange={e => setRenewForm(p => ({ ...p, renewal_date: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}

          {/* ── TERMINATE ── */}
          {action === 'terminate' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /><p className="text-sm font-bold text-red-800">Terminate Lease?</p></div>
              <p className="text-xs text-red-600">Marks the lease as <strong>terminated</strong> and sets the unit to <strong>vacant</strong>.</p>
              <div className="bg-red-100 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 font-medium">{tenantName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
              {error && <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-3"><p className="text-sm text-red-700">{error}</p></div>}
            </div>
          )}

          {/* ── END ── */}
          {action === 'end' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-amber-600" /><p className="text-sm font-bold text-amber-800">End Lease?</p></div>
              <p className="text-xs text-amber-700">Marks the lease as <strong>ended</strong> and sets the unit to <strong>vacant</strong>. Use when tenant is leaving normally.</p>
              <div className="bg-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700 font-medium">{tenantName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          {action === null && <Button variant="outline" onClick={handleClose} className="h-9 text-sm rounded-lg px-5">Close</Button>}
          {action === 'payment' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Back</Button>
            <Button onClick={handleRecordPayment} disabled={loading} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Record Payment'}
            </Button>
          </>}
          {action === 'extend' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
            <Button onClick={handleExtend} disabled={loading} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Extend Lease'}
            </Button>
          </>}
          {action === 'renew' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Back</Button>
            <Button onClick={handleRenew} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Renewing...</> : 'Confirm Renewal'}
            </Button>
          </>}
          {action === 'terminate' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
            <Button onClick={handleTerminate} disabled={loading} className="h-9 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Terminating...</> : 'Yes, Terminate'}
            </Button>
          </>}
          {action === 'end' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Cancel</Button>
            <Button onClick={handleEndLease} disabled={loading} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ending...</> : 'Yes, End Lease'}
            </Button>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  )
}


