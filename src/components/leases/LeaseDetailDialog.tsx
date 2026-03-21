'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, User, Home, Calendar, DollarSign,
  RefreshCw, XCircle, CheckCircle2, Printer,
  CreditCard, Plus, X, ArrowLeft, Pencil,
  Clock, AlertTriangle, TrendingUp, Key,
  FileText, ChevronDown
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
type Tab = 'overview' | 'payments' | 'files'

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
      await supabase.from('leases').update(val({
        lease_end: extendForm.new_end_date,
        rent_amount: newRent,
      })).eq('id', lease.id)
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
        organization_id: organizationId,
        tenant_id: lease.tenant_id,
        unit_id: lease.unit_id,
        rent_amount: parseFloat(renewForm.rent_amount),
        lease_start: renewForm.lease_start,
        lease_end: renewForm.lease_end || null,
        renewal_date: renewForm.renewal_date || null,
        status: 'active',
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
        lease_id: lease.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        method: paymentForm.method || null,
        reference: paymentForm.reference.trim() || null,
        status: 'completed',
      }))
      onUpdated(); handleClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  function handlePrint() {
    if (!lease) return
    const tenant = (lease as any).tenants
    const unit = (lease as any).units
    const tenantName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
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
        <div class="row"><span class="label">Unit</span><span class="value">${unit?.unit_code ?? '—'}</span></div>
        <div class="row"><span class="label">Building</span><span class="value">${unit?.buildings?.name ?? '—'}</span></div>
        <div class="row"><span class="label">Monthly rent</span><span class="value">$${Number(lease.rent_amount).toLocaleString()}</span></div>
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
    .filter((p) => p.status === 'completed')
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const totalPaid = completedPayments.reduce((s, p) => s + Number(p.amount), 0)

  const actionTitle = {
    null: null, payment: 'Record Payment', renew: 'Renew Lease',
    extend: 'Extend Lease', end: 'End Lease', terminate: 'Terminate Lease',
  }[action as string]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {action !== null && (
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                {tenant?.photo_url
                  ? <img src={tenant.photo_url} alt={tenantName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">{initials}</div>}
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-gray-900">
                  {tenantName} {action !== null && <span className="text-gray-400 font-normal">· {actionTitle}</span>}
                  {action === null && <span className="text-gray-400 font-normal text-xs ml-1">Lease Details</span>}
                </DialogTitle>
                <p className="text-xs text-gray-400">{unit?.unit_code} · {unit?.buildings?.name}</p>
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── MAIN DETAIL VIEW ── */}
        {action === null && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 border-b border-gray-100 flex-shrink-0">
              {(['overview', 'payments', 'files'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
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

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  {/* Status banner */}
                  <div className={`rounded-xl border p-3 flex items-center justify-between ${
                    isOverdue ? 'bg-red-50 border-red-200' :
                    isDueSoon ? 'bg-amber-50 border-amber-200' :
                    lease.status === 'active' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Key className={`h-4 w-4 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {isOverdue ? `Lease expired ${Math.abs(daysLeft!)} days ago` :
                           isDueSoon ? `Expiring in ${daysLeft} days` :
                           lease.status === 'active' ? 'Active Lease' : `Lease ${lease.status}`}
                        </p>
                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {format(new Date(lease.lease_start), 'MMM d, yyyy')} →{' '}
                          {lease.lease_end ? format(new Date(lease.lease_end), 'MMM d, yyyy') : 'Open-ended'}
                        </p>
                      </div>
                    </div>
                    {lease.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setExtendForm({ new_end_date: lease.lease_end ?? '', rent_amount: String(lease.rent_amount), no_rent_change: true })
                        setAction('extend')
                      }}
                        className={`h-7 text-xs rounded-lg ${isDueSoon || isOverdue ? 'border-amber-200 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit Lease
                      </Button>
                    )}
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Monthly Rent', value: `$${Number(lease.rent_amount).toLocaleString()}`, sub: 'per month' },
                      { label: 'Unit', value: unit?.unit_code ?? '—', sub: unit?.buildings?.name },
                      { label: 'Duration', value: `${monthsActive}mo`, sub: `since ${format(new Date(lease.lease_start), 'MMM yyyy')}` },
                      { label: 'Balance', value: '$0.00', sub: 'up to date' },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{m.label}</p>
                        <p className="text-base font-bold text-gray-800 mt-1">{m.value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Next payment due */}
                  {lease.status === 'active' && (
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Next Payment Due</p>
                          <p className="text-sm font-semibold text-gray-800 mt-1">
                            {format(new Date(lease.lease_start), 'do')} of every month ·{' '}
                            <span className="text-emerald-600">${Number(lease.rent_amount).toLocaleString()}</span>
                          </p>
                        </div>
                        {completedPayments.length > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Last payment</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {format(new Date(completedPayments[0].payment_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total paid */}
                  {totalPaid > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-xs text-emerald-600 font-medium">Total Paid</p>
                          <p className="text-sm font-bold text-emerald-700">${totalPaid.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-emerald-600">{completedPayments.length} payments</p>
                        <p className="text-xs text-emerald-500">{monthsActive} months</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-2 pt-2">
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
                        <Printer className="h-3.5 w-3.5 text-gray-400" /> Print Summary
                      </Button>
                    </div>
                    {lease.status === 'active' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="justify-start gap-2 h-9 text-sm rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                          onClick={() => { setRenewForm({ rent_amount: String(lease.rent_amount), lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' }); setAction('renew') }}>
                          <RefreshCw className="h-3.5 w-3.5" /> Renew Lease
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
                </div>
              )}

              {/* ── PAYMENTS TAB ── */}
              {tab === 'payments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{completedPayments.length} payments recorded</p>
                      <p className="text-xs text-gray-400">Total collected: <span className="font-semibold text-emerald-600">${totalPaid.toLocaleString()}</span></p>
                    </div>
                    {lease.status === 'active' && (
                      <Button size="sm" onClick={() => {
                        setPaymentForm({ amount: String(lease.rent_amount), payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
                        setAction('payment')
                      }}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5">
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
                      {completedPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">${Number(p.amount).toLocaleString()}</p>
                              <p className="text-xs text-gray-400 capitalize">
                                {p.method?.replace('_', ' ') ?? 'Cash'}
                                {p.reference ? ` · ref: ${p.reference}` : ''}
                              </p>
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

              {/* ── FILES TAB ── */}
              {tab === 'files' && (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium text-gray-500">No files attached</p>
                  <p className="text-xs text-gray-400 mt-1">Lease agreements and documents will appear here</p>
                  <Button size="sm" variant="outline" className="mt-4 text-xs h-8 rounded-lg">Upload File</Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── RECORD PAYMENT ── */}
        {action === 'payment' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-emerald-800">{tenantName} · Unit {unit?.unit_code}</p>
              <p className="text-xs text-emerald-600">Monthly rent: <span className="font-semibold">${Number(lease.rent_amount).toLocaleString()}</span></p>
              {completedPayments.length > 0 && (
                <p className="text-xs text-emerald-600">Last payment: <span className="font-semibold">{format(new Date(completedPayments[0].payment_date), 'MMM d, yyyy')}</span></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount Paid *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <Input type="number" placeholder={String(lease.rent_amount)} value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment Date *</Label>
                <Input type="date" value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Method</Label>
                <Select value={paymentForm.method}
                  // @ts-ignore
                  onValueChange={(v: string) => setPaymentForm((p) => ({ ...p, method: v }))}>
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
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          </div>
        )}

        {/* ── EXTEND LEASE ── */}
        {action === 'extend' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800">Extend lease for {tenantName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Unit {unit?.unit_code} · {unit?.buildings?.name}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New End Date *</Label>
              <Input type="date" value={extendForm.new_end_date}
                onChange={(e) => setExtendForm((p) => ({ ...p, new_end_date: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <button onClick={() => setExtendForm((p) => ({ ...p, no_rent_change: !p.no_rent_change }))}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${extendForm.no_rent_change ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${extendForm.no_rent_change ? 'translate-x-5' : ''}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-800">No Rent Change</p>
                <p className="text-xs text-gray-400">Keep rent at ${Number(lease.rent_amount).toLocaleString()}/mo</p>
              </div>
            </div>
            {!extendForm.no_rent_change && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Rent Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <Input type="number" placeholder={String(lease.rent_amount)} value={extendForm.rent_amount}
                    onChange={(e) => setExtendForm((p) => ({ ...p, rent_amount: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                </div>
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          </div>
        )}

        {/* ── RENEW LEASE ── */}
        {action === 'renew' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800">Renewing lease for {tenantName}</p>
              <p className="text-xs text-blue-600 mt-0.5">Current lease will end and a new one will be created</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Rent Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <Input type="number" value={renewForm.rent_amount}
                    onChange={(e) => setRenewForm((p) => ({ ...p, rent_amount: e.target.value }))}
                    className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">New Start Date *</Label>
                <Input type="date" value={renewForm.lease_start}
                  onChange={(e) => setRenewForm((p) => ({ ...p, lease_start: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">End Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input type="date" value={renewForm.lease_end}
                  onChange={(e) => setRenewForm((p) => ({ ...p, lease_end: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Renewal Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input type="date" value={renewForm.renewal_date}
                  onChange={(e) => setRenewForm((p) => ({ ...p, renewal_date: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          </div>
        )}

        {/* ── TERMINATE ── */}
        {action === 'terminate' && (
          <div className="overflow-y-auto flex-1 px-6 py-5">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-bold text-red-800">Terminate Lease?</p>
              </div>
              <p className="text-xs text-red-600">Marks the lease as <strong>terminated</strong> and sets the unit to <strong>vacant</strong>. Use for evictions or forced early terminations.</p>
              <div className="bg-red-100 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 font-medium">{tenantName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
            </div>
            {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          </div>
        )}

        {/* ── END LEASE ── */}
        {action === 'end' && (
          <div className="overflow-y-auto flex-1 px-6 py-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">End Lease?</p>
              </div>
              <p className="text-xs text-amber-700">Marks the lease as <strong>ended</strong> and sets the unit to <strong>vacant</strong>. Use when tenant is leaving normally.</p>
              <div className="bg-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700 font-medium">{tenantName} · Unit {unit?.unit_code} · Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}</p>
              </div>
            </div>
            {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          {action === null && <Button variant="outline" onClick={handleClose} className="h-9 text-sm rounded-lg px-5">Close</Button>}
          {action === 'payment' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Back</Button>
            <Button onClick={handleRecordPayment} disabled={loading} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-5">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Record Payment'}
            </Button>
          </>}
          {action === 'extend' && <>
            <Button variant="outline" onClick={reset} className="h-9 text-sm rounded-lg px-4">Back</Button>
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


