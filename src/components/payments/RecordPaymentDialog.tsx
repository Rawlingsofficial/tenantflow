'use client'

import { useEffect, useState } from 'react'
import { Loader2, X, CreditCard, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  organizationId: string
  preselectedLeaseId?: string
}

function dbVal<T>(v: T): never { return v as never }

export default function RecordPaymentDialog({ open, onClose, onSaved, organizationId, preselectedLeaseId }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leases, setLeases] = useState<any[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId ?? '')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
  })

  useEffect(() => {
    if (open) {
      setError('')
      setSelectedLeaseId(preselectedLeaseId ?? '')
      setForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
      loadLeases()
    }
  }, [open])

  async function loadLeases() {
    const { data } = await supabase
      .from('leases')
      .select(`id, rent_amount, lease_start,
        tenants(first_name, last_name, photo_url),
        units(unit_code, buildings(name))`)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('lease_start', { ascending: false })
    const rows = (data ?? []) as any[]
    setLeases(rows)
    if (preselectedLeaseId) {
      const l = rows.find((x: any) => x.id === preselectedLeaseId)
      if (l) setForm(f => ({ ...f, amount: String(l.rent_amount) }))
    }
  }

  const filteredLeases = leases.filter(l => {
    const q = search.toLowerCase()
    const t = l.tenants
    const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    return !q || name.includes(q) || l.units?.unit_code?.toLowerCase().includes(q) ||
      l.units?.buildings?.name?.toLowerCase().includes(q)
  })

  const selectedLease = leases.find(l => l.id === selectedLeaseId)

  async function handleSave() {
    if (!selectedLeaseId) { setError('Please select a lease'); return }
    if (!form.amount) { setError('Amount is required'); return }
    if (!form.payment_date) { setError('Payment date is required'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.from('rent_payments').insert(dbVal({
        lease_id: selectedLeaseId,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        method: form.method || null,
        reference: form.reference.trim() || null,
        status: 'completed',
      }))
      if (err) throw new Error(err.message)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">Record Payment</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">Log a rent payment for a lease</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Lease selector */}
          {!preselectedLeaseId && (
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Select Lease *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input placeholder="Search tenant or unit..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {filteredLeases.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400">No active leases found</div>
                ) : filteredLeases.map(l => {
                  const t = l.tenants
                  const name = `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const initials = `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  const isSelected = selectedLeaseId === l.id
                  return (
                    <button key={l.id} onClick={() => {
                      setSelectedLeaseId(l.id)
                      setForm(f => ({ ...f, amount: String(l.rent_amount) }))
                    }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                        isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>{initials || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{l.units?.unit_code} · {l.units?.buildings?.name}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">${Number(l.rent_amount).toLocaleString()}/mo</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected lease summary */}
          {selectedLease && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-xs text-emerald-600 font-medium">
                {`${selectedLease.tenants?.first_name ?? ''} ${selectedLease.tenants?.last_name ?? ''}`.trim()}
                {' · '}
                {selectedLease.units?.unit_code}
                {' · '}
                Expected: <span className="font-bold">${Number(selectedLease.rent_amount).toLocaleString()}/mo</span>
              </p>
            </div>
          )}

          {/* Payment fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount Paid *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                <Input type="number" min="0" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Payment Date *</Label>
              <Input type="date" value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Method</Label>
              <Select value={form.method}
                // @ts-ignore
                onValueChange={(v: string) => setForm(f => ({ ...f, method: v }))}>
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
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Reference <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input placeholder="e.g. TXN123456" value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-lg px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-6">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
