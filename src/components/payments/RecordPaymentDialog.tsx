'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search } from 'lucide-react'
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
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface ActiveLease {
  id: string
  rent_amount: number
  lease_start: string
  tenant_id: string
  unit_id: string
  tenants: {
    first_name: string | null
    last_name: string | null
    primary_phone: string | null
  } | null
  units: {
    unit_code: string
    buildings: { name: string } | null
  } | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  organizationId: string
  preselectedLeaseId?: string
}

export default function RecordPaymentDialog({
  open, onClose, onSaved, organizationId, preselectedLeaseId
}: Props) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId ?? '')

  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
  })

  useEffect(() => {
    if (open) {
      loadActiveLeases()
      setSelectedLeaseId(preselectedLeaseId ?? '')
      setError('')
      setSearch('')
      setForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        method: 'cash',
        reference: '',
      })
    }
  }, [open, preselectedLeaseId])

  useEffect(() => {
    const lease = activeLeases.find((l) => l.id === selectedLeaseId)
    if (lease) {
      setForm((prev) => ({ ...prev, amount: String(lease.rent_amount) }))
    }
  }, [selectedLeaseId, activeLeases])

  async function loadActiveLeases() {
    const { data } = await supabase
      .from('leases')
      .select(`
        id, rent_amount, lease_start, tenant_id, unit_id,
        tenants ( first_name, last_name, primary_phone ),
        units ( unit_code, buildings ( name ) )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('lease_start', { ascending: false })

    setActiveLeases((data as ActiveLease[]) ?? [])
  }

  async function handleSave() {
    if (!selectedLeaseId) { setError('Please select a lease'); return }
    if (!form.amount) { setError('Amount is required'); return }
    if (!form.payment_date) { setError('Payment date is required'); return }

    setLoading(true)
    setError('')

    try {
      const { error: payErr } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: selectedLeaseId,
          amount: parseFloat(form.amount),
          payment_date: form.payment_date,
          method: form.method || null,
          reference: form.reference.trim() || null,
          status: 'completed',
        } as any)

      if (payErr) throw new Error(payErr.message)
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeases = activeLeases.filter((l) => {
    const q = search.toLowerCase()
    const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.toLowerCase()
    const unit = l.units?.unit_code?.toLowerCase() ?? ''
    const building = l.units?.buildings?.name?.toLowerCase() ?? ''
    return !q || name.includes(q) || unit.includes(q) || building.includes(q)
  })

  const selectedLease = activeLeases.find((l) => l.id === selectedLeaseId)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record rent payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lease selector — only when no preselected lease */}
          {!preselectedLeaseId && (
            <div className="space-y-2">
              <Label>Select tenant / lease *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tenant, unit, building..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                {filteredLeases.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No active leases found
                  </p>
                ) : (
                  filteredLeases.map((lease) => {
                    const name = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
                    return (
                      <button
                        key={lease.id}
                        onClick={() => setSelectedLeaseId(lease.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0 ${
                          selectedLeaseId === lease.id
                            ? 'bg-indigo-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {name[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {lease.units?.unit_code} · {lease.units?.buildings?.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">
                            {Number(lease.rent_amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400">/ month</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Selected lease info */}
          {selectedLease && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1">
              <p className="text-sm font-medium text-indigo-900">
                {`${selectedLease.tenants?.first_name ?? ''} ${selectedLease.tenants?.last_name ?? ''}`.trim()}
              </p>
              <p className="text-xs text-indigo-600">
                {selectedLease.units?.unit_code} · {selectedLease.units?.buildings?.name}
              </p>
              <p className="text-xs text-indigo-600">
                Lease started: {format(new Date(selectedLease.lease_start), 'dd MMM yyyy')} ·
                Expected:{' '}
                <span className="font-semibold">
                  {Number(selectedLease.rent_amount).toLocaleString()}
                </span>{' '}
                / month
              </p>
            </div>
          )}

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount paid *</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment date *</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={form.method}
                onValueChange={(v) => setForm((p) => ({ ...p, method: v }))}
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
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : 'Record payment'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

