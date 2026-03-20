'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, User, Home, Calendar, DollarSign,
  RefreshCw, XCircle, CheckCircle2, Printer,
  CreditCard, Plus
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
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

type Action = null | 'terminate' | 'renew' | 'end' | 'payment' | 'new_lease'

export default function LeaseDetailDialog({
  open, onClose, lease, organizationId, onUpdated
}: Props) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [action, setAction] = useState<Action>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [renewForm, setRenewForm] = useState({
    rent_amount: '',
    lease_start: '',
    lease_end: '',
    renewal_date: '',
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
  })

  const [newLeaseForm, setNewLeaseForm] = useState({
    rent_amount: '',
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: '',
    renewal_date: '',
  })

  function reset() {
    setAction(null)
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleTerminate() {
    if (!lease) return
    const db = supabase as any
    setLoading(true)
    setError('')
    try {
      const { error: leaseErr } = await db
        .from('leases')
        .update({ status: 'terminated' })
        .eq('id', lease.id)
      if (leaseErr) throw new Error(leaseErr.message)

      await db
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', lease.unit_id)

      onUpdated()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to terminate')
    } finally {
      setLoading(false)
    }
  }

  async function handleEndLease() {
    if (!lease) return
    const db = supabase as any
    setLoading(true)
    setError('')
    try {
      const { error: leaseErr } = await db
        .from('leases')
        .update({
          status: 'ended',
          lease_end: new Date().toISOString().split('T')[0],
        })
        .eq('id', lease.id)
      if (leaseErr) throw new Error(leaseErr.message)

      await db
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', lease.unit_id)

      onUpdated()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to end lease')
    } finally {
      setLoading(false)
    }
  }

  async function handleRenew() {
    if (!lease) return
    if (!renewForm.rent_amount) { setError('Rent amount is required'); return }
    if (!renewForm.lease_start) { setError('Start date is required'); return }
    const db = supabase as any
    setLoading(true)
    setError('')
    try {
      await db
        .from('leases')
        .update({ status: 'ended' })
        .eq('id', lease.id)

      const { error: newErr } = await db
        .from('leases')
        .insert({
          organization_id: organizationId,
          tenant_id: lease.tenant_id,
          unit_id: lease.unit_id,
          rent_amount: parseFloat(renewForm.rent_amount),
          lease_start: renewForm.lease_start,
          lease_end: renewForm.lease_end || null,
          renewal_date: renewForm.renewal_date || null,
          status: 'active',
        })
      if (newErr) throw new Error(newErr.message)

      onUpdated()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to renew')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecordPayment() {
    if (!lease) return
    if (!paymentForm.amount) { setError('Amount is required'); return }
    if (!paymentForm.payment_date) { setError('Payment date is required'); return }
    const db = supabase as any
    setLoading(true)
    setError('')
    try {
      const { error: payErr } = await db
        .from('rent_payments')
        .insert({
          lease_id: lease.id,
          amount: parseFloat(paymentForm.amount),
          payment_date: paymentForm.payment_date,
          method: paymentForm.method || null,
          reference: paymentForm.reference.trim() || null,
          status: 'completed',
        })
      if (payErr) throw new Error(payErr.message)
      onUpdated()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  async function handleNewLease() {
    if (!lease) return
    if (!newLeaseForm.rent_amount) { setError('Rent amount is required'); return }
    if (!newLeaseForm.lease_start) { setError('Start date is required'); return }
    const db = supabase as any
    setLoading(true)
    setError('')
    try {
      const { error: newErr } = await db
        .from('leases')
        .insert({
          organization_id: organizationId,
          tenant_id: lease.tenant_id,
          unit_id: lease.unit_id,
          rent_amount: parseFloat(newLeaseForm.rent_amount),
          lease_start: newLeaseForm.lease_start,
          lease_end: newLeaseForm.lease_end || null,
          renewal_date: newLeaseForm.renewal_date || null,
          status: 'active',
        })
      if (newErr) throw new Error(newErr.message)
      onUpdated()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create lease')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!lease) return
    const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Lease Summary</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 2rem; max-width: 600px; }
              h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
              .row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
              .label { color: #64748b; font-size: 0.875rem; }
              .value { font-weight: 600; color: #1e293b; }
              .footer { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; }
            </style>
          </head>
          <body>
            <h2>Lease Summary</h2>
            <div class="row"><span class="label">Tenant</span><span class="value">${tenantName}</span></div>
            <div class="row"><span class="label">Unit</span><span class="value">${lease.units?.unit_code ?? '—'}</span></div>
            <div class="row"><span class="label">Building</span><span class="value">${lease.units?.buildings?.name ?? '—'}</span></div>
            <div class="row"><span class="label">Monthly rent</span><span class="value">${Number(lease.rent_amount).toLocaleString()}</span></div>
            <div class="row"><span class="label">Lease started</span><span class="value">${format(new Date(lease.lease_start), 'dd MMM yyyy')}</span></div>
            <div class="row"><span class="label">Lease end</span><span class="value">${lease.lease_end ? format(new Date(lease.lease_end), 'dd MMM yyyy') : 'Open ended'}</span></div>
            <div class="row"><span class="label">Status</span><span class="value">${lease.status.toUpperCase()}</span></div>
            <div class="footer">Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} · TenantFlow</div>
          </body>
        </html>
      `)
      win.document.close()
      win.print()
    }
  }

  if (!lease) return null

  const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
  const daysLeft = lease.lease_end
    ? differenceInDays(new Date(lease.lease_end), new Date())
    : null
  const daysSinceStart = differenceInDays(new Date(), new Date(lease.lease_start))

  const payments = lease.rent_payments ?? []
  const completedPayments = payments
    .filter((p) => p.status === 'completed')
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {action === null && 'Lease details'}
            {action === 'payment' && 'Record rent payment'}
            {action === 'renew' && 'Renew lease'}
            {action === 'new_lease' && 'Create new lease'}
            {action === 'end' && 'End lease'}
            {action === 'terminate' && 'Terminate lease'}
          </DialogTitle>
        </DialogHeader>

        {/* ── DETAIL VIEW ── */}
        {action === null && (
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tenantName}</p>
                  <p className="text-xs text-slate-400">
                    {lease.tenants?.primary_phone ?? lease.tenants?.email ?? 'No contact'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Home className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {lease.units?.unit_code}
                  </p>
                  <p className="text-xs text-slate-400">
                    {lease.units?.buildings?.name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Lease started</p>
                    <p className="text-sm font-semibold text-indigo-700">
                      {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {daysSinceStart} days ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Lease ends</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {lease.lease_end
                        ? format(new Date(lease.lease_end), 'dd MMM yyyy')
                        : 'Open ended'}
                    </p>
                    {lease.lease_end && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {daysLeft !== null && daysLeft > 0
                          ? `${daysLeft} days left`
                          : daysLeft !== null
                            ? `${Math.abs(daysLeft)} days overdue`
                            : ''
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Rent / month</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {Number(lease.rent_amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Due every {format(new Date(lease.lease_start), 'do')} of month
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <p className={`text-sm font-medium ${
                      lease.status === 'active' ? 'text-emerald-600'
                      : lease.status === 'terminated' ? 'text-red-500'
                      : 'text-slate-500'
                    }`}>
                      {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {completedPayments.length} payment{completedPayments.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                </div>
              </div>

              {lease.status === 'active' && daysLeft !== null && (
                <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  daysLeft < 0 ? 'bg-red-100 text-red-700'
                  : daysLeft <= 30 ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {daysLeft < 0
                    ? `⚠ Lease expired ${Math.abs(daysLeft)} days ago`
                    : daysLeft <= 30
                      ? `⚠ Expiring in ${daysLeft} days — consider renewing`
                      : `✓ ${daysLeft} days remaining`
                  }
                </div>
              )}
            </div>

            {completedPayments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Payment history ({completedPayments.length} total)
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {completedPayments.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {Number(p.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">
                            {p.method?.replace('_', ' ') ?? 'cash'}
                            {p.reference ? ` · ref: ${p.reference}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600">
                          {format(new Date(p.payment_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(p.payment_date), 'MMMM yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1">
              {lease.status === 'active' && (
                <Button
                  className="w-full justify-start gap-2 h-10 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setPaymentForm({
                      amount: String(lease.rent_amount),
                      payment_date: new Date().toISOString().split('T')[0],
                      method: 'cash',
                      reference: '',
                    })
                    setAction('payment')
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  Record rent payment
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10"
                onClick={() => router.push(`/tenants/${lease.tenant_id}`)}
              >
                <User className="h-4 w-4 text-slate-400" />
                View tenant profile
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 text-slate-400" />
                Print lease summary
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10 text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
                onClick={() => {
                  setNewLeaseForm({
                    rent_amount: String(lease.rent_amount),
                    lease_start: new Date().toISOString().split('T')[0],
                    lease_end: '',
                    renewal_date: '',
                  })
                  setAction('new_lease')
                }}
              >
                <Plus className="h-4 w-4" />
                Add new lease
              </Button>

              {lease.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-10 text-blue-600 hover:text-blue-700 hover:border-blue-200"
                    onClick={() => {
                      setRenewForm({
                        rent_amount: String(lease.rent_amount),
                        lease_start: new Date().toISOString().split('T')[0],
                        lease_end: '',
                        renewal_date: '',
                      })
                      setAction('renew')
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Renew lease
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-10 text-amber-600 hover:text-amber-700 hover:border-amber-200"
                    onClick={() => setAction('end')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    End lease (tenant leaving)
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-10 text-red-500 hover:text-red-600 hover:border-red-200"
                    onClick={() => setAction('terminate')}
                  >
                    <XCircle className="h-4 w-4" />
                    Terminate lease (eviction)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── RECORD PAYMENT ── */}
        {action === 'payment' && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg space-y-1">
              <p className="text-sm font-medium text-emerald-800">
                {tenantName} · Unit {lease.units?.unit_code}
              </p>
              <p className="text-xs text-emerald-600">
                Lease started:{' '}
                <span className="font-semibold">
                  {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                </span>
              </p>
              <p className="text-xs text-emerald-600">
                Expected monthly rent:{' '}
                <span className="font-semibold">
                  {Number(lease.rent_amount).toLocaleString()}
                </span>
              </p>
              {completedPayments.length > 0 && (
                <p className="text-xs text-emerald-600">
                  Last payment:{' '}
                  <span className="font-semibold">
                    {format(new Date(completedPayments[0].payment_date), 'dd MMM yyyy')}
                    {' · '}
                    {Number(completedPayments[0].amount).toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount paid *</Label>
                <Input
                  type="number"
                  placeholder={String(lease.rent_amount)}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment date *</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v as string }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Reference{' '}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. TXN123"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        {/* ── NEW LEASE ── */}
        {action === 'new_lease' && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-sm font-medium text-indigo-800">
                New lease for {tenantName}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Unit {lease.units?.unit_code} · {lease.units?.buildings?.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rent amount *</Label>
                <Input
                  type="number"
                  value={newLeaseForm.rent_amount}
                  onChange={(e) => setNewLeaseForm((p) => ({ ...p, rent_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start date *</Label>
                <Input
                  type="date"
                  value={newLeaseForm.lease_start}
                  onChange={(e) => setNewLeaseForm((p) => ({ ...p, lease_start: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>End date <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={newLeaseForm.lease_end}
                  onChange={(e) => setNewLeaseForm((p) => ({ ...p, lease_end: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Renewal date <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={newLeaseForm.renewal_date}
                  onChange={(e) => setNewLeaseForm((p) => ({ ...p, renewal_date: e.target.value }))}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        {/* ── RENEW ── */}
        {action === 'renew' && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Renewing lease</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Current lease will be marked as ended and a new one created
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>New rent amount *</Label>
                <Input
                  type="number"
                  value={renewForm.rent_amount}
                  onChange={(e) => setRenewForm((p) => ({ ...p, rent_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New start date *</Label>
                <Input
                  type="date"
                  value={renewForm.lease_start}
                  onChange={(e) => setRenewForm((p) => ({ ...p, lease_start: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>New end date <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={renewForm.lease_end}
                  onChange={(e) => setRenewForm((p) => ({ ...p, lease_end: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Renewal date <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  type="date"
                  value={renewForm.renewal_date}
                  onChange={(e) => setRenewForm((p) => ({ ...p, renewal_date: e.target.value }))}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        {/* ── TERMINATE ── */}
        {action === 'terminate' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Terminate lease?
              </p>
              <p className="text-xs text-red-600">
                Marks the lease as <strong>terminated</strong> and sets the
                unit back to <strong>vacant</strong>. Use for evictions or
                forced early terminations.
              </p>
              <p className="text-xs text-red-500 font-medium">
                {tenantName} · Unit {lease.units?.unit_code} ·{' '}
                Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        {/* ── END LEASE ── */}
        {action === 'end' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                End lease?
              </p>
              <p className="text-xs text-amber-700">
                Marks the lease as <strong>ended</strong> and sets the unit
                back to <strong>vacant</strong>. Use when tenant is leaving
                normally.
              </p>
              <p className="text-xs text-amber-600 font-medium">
                {tenantName} · Unit {lease.units?.unit_code} ·{' '}
                Started {format(new Date(lease.lease_start), 'dd MMM yyyy')}
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {action === null && (
            <Button variant="outline" onClick={handleClose}>Close</Button>
          )}
          {action === 'payment' && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleRecordPayment}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                  : 'Record payment'
                }
              </Button>
            </>
          )}
          {action === 'new_lease' && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleNewLease}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                  : 'Create lease'
                }
              </Button>
            </>
          )}
          {action === 'renew' && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleRenew}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Renewing...</>
                  : 'Confirm renewal'
                }
              </Button>
            </>
          )}
          {action === 'terminate' && (
            <>
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button
                onClick={handleTerminate}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Terminating...</>
                  : 'Yes, terminate'
                }
              </Button>
            </>
          )}
          {action === 'end' && (
            <>
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button
                onClick={handleEndLease}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ending...</>
                  : 'Yes, end lease'
                }
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

