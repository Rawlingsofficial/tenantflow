'use client'

import { useEffect, useState } from 'react'
import { Loader2, X, CreditCard, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { HouseIcon, BuildingIcon } from '@/components/ui/portfolio-icons'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  organizationId: string
  preselectedLeaseId?: string
}

interface PayForm {
  amount: string
  payment_date: string
  method: string
  reference: string
}

function dbVal<T>(v: T): never { return v as never }

export default function RecordPaymentDialog({ open, onClose, onSaved, organizationId, preselectedLeaseId }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [leases,  setLeases]  = useState<any[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId ?? '')
  const [search,  setSearch]  = useState('')

  const [form, setForm] = useState<PayForm>({
    amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '',
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
        tenants(first_name, last_name, photo_url, tenant_type, company_name),
        units(unit_code, buildings(name, building_type))`)
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
    const q  = search.toLowerCase()
    const t  = l.tenants
    const isC = t?.tenant_type === 'company'
    const name = isC ? (t?.company_name ?? '').toLowerCase() : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.toLowerCase()
    return !q || name.includes(q) || l.units?.unit_code?.toLowerCase().includes(q) ||
      l.units?.buildings?.name?.toLowerCase().includes(q)
  })

  const selectedLease = leases.find(l => l.id === selectedLeaseId)

  async function handleSave() {
    if (!selectedLeaseId)  { setError('Please select a lease'); return }
    if (!form.amount)       { setError('Amount is required'); return }
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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#1B3B6F]/4 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1B3B6F] flex items-center justify-center shadow-sm">
              <CreditCard className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">Record Payment</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Log a rent payment for a lease</p>
            </div>
          </div>
          <button onClick={onClose} className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Lease selector */}
          {!preselectedLeaseId && (
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Select Lease *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Search tenant, unit…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25" />
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {filteredLeases.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No active leases found</div>
                ) : filteredLeases.map(l => {
                  const t   = l.tenants
                  const isC = t?.tenant_type === 'company'
                  const name = isC ? (t?.company_name ?? '—') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const init = isC ? (t?.company_name ?? 'C')[0].toUpperCase() : `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  const bt   = l.units?.buildings?.building_type
                  const isSelected = selectedLeaseId === l.id
                  const isCommercial = bt === 'commercial'

                  return (
                    <button key={l.id}
                      onClick={() => { setSelectedLeaseId(l.id); setForm(f => ({ ...f, amount: String(l.rent_amount) })) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0 ${
                        isSelected ? 'bg-teal-50' : 'hover:bg-slate-50'
                      }`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? 'bg-teal-100 text-teal-700' : 'bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] text-[#14b8a6]'
                      }`}>{init || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-400">{l.units?.unit_code} · {l.units?.buildings?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-bold text-teal-600">${Number(l.rent_amount).toLocaleString()}/mo</span>
                        {bt && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isCommercial
                              ? 'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/15'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {isCommercial
                              ? <BuildingIcon className="w-2.5 h-2.5 text-[#1B3B6F]" />
                              : <HouseIcon className="w-2.5 h-2.5 text-teal-600" />}
                            {isCommercial ? 'Commercial' : 'Residential'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected lease summary */}
          {selectedLease && (() => {
            const t   = selectedLease.tenants
            const isC = t?.tenant_type === 'company'
            const name = isC ? (t?.company_name ?? '—') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
            const bt   = selectedLease.units?.buildings?.building_type
            const isCommercial = bt === 'commercial'
            return (
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-teal-800">{name} · {selectedLease.units?.unit_code}</p>
                  <p className="text-xs text-teal-600 mt-0.5">Expected: <span className="font-bold">${Number(selectedLease.rent_amount).toLocaleString()}/mo</span></p>
                </div>
                {bt && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCommercial
                      ? 'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20'
                      : 'bg-teal-100 text-teal-700 border border-teal-200'
                  }`}>
                    {isCommercial
                      ? <BuildingIcon className="w-3 h-3 text-[#1B3B6F]" />
                      : <HouseIcon className="w-3 h-3 text-teal-600" />}
                    {isCommercial ? 'Commercial' : 'Residential'}
                  </span>
                )}
              </div>
            )
          })()}

          {/* Payment fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Amount Paid *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                <Input type="number" min="0" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-9 text-sm rounded-xl border-slate-200 pl-6 focus:ring-2 focus:ring-teal-400/25" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Payment Date *</Label>
              <Input type="date" value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Method</Label>
              <Select value={form.method} onValueChange={(v) => { if (v) setForm(f => ({ ...f, method: v })) }}>
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
              <Input placeholder="e.g. TXN123456" value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl px-6 shadow-sm">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
