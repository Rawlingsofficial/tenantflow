'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Receipt } from 'lucide-react'
import { format, addDays } from 'date-fns'

function dbVal<T>(v: T): never { return v as never }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  preselectedLeaseId?: string
}

export default function CreateInvoiceDialog({ open, onClose, onSaved, preselectedLeaseId }: Props) {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [leases, setLeases] = useState<any[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId ?? '')
  const [form, setForm] = useState({
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    rent_amount: '',
    service_charge: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open && orgId) loadLeases() }, [open, orgId])
  useEffect(() => { if (preselectedLeaseId) setSelectedLeaseId(preselectedLeaseId) }, [preselectedLeaseId])

  useEffect(() => {
    const lease = leases.find(l => l.id === selectedLeaseId)
    if (lease) {
      setForm(f => ({
        ...f,
        rent_amount: String(lease.rent_amount ?? ''),
        service_charge: String(lease.service_charge ?? ''),
        due_date: format(addDays(new Date(f.invoice_date), lease.payment_terms ?? 30), 'yyyy-MM-dd'),
      }))
    }
  }, [selectedLeaseId, leases])

  async function loadLeases() {
    const { data } = await (supabase as any)
      .from('leases')
      .select(`*, tenants(first_name, last_name, company_name, contact_person, tenant_type, user_id), units(unit_code, buildings(name))`)
      .eq('organization_id', orgId!)
      .eq('status', 'active')
    setLeases(data ?? [])
  }

  async function handleSave() {
    if (!selectedLeaseId) { setError('Please select a lease'); return }
    if (!form.rent_amount) { setError('Rent amount is required'); return }
    setSaving(true); setError('')
    try {
      const rent = Number(form.rent_amount)
      const sc = Number(form.service_charge) || 0
      const now = new Date()
      const invNum = `INV-${format(now, 'yyyyMM')}-${Math.floor(Math.random() * 900 + 100)}`
      const { error: e } = await (supabase as any).from('invoices').insert({
        organization_id: orgId!,
        lease_id: selectedLeaseId,
        invoice_number: invNum,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        rent_amount: rent,
        service_charge: sc,
        total_amount: rent + sc,
        status: 'draft',
        notes: form.notes || null,
      })
      if (e) throw new Error(e.message)
      onSaved()
      setForm({
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        rent_amount: '', service_charge: '', notes: '',
      })
      setSelectedLeaseId('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  const selectedLease = leases.find(l => l.id === selectedLeaseId)
  const total = (Number(form.rent_amount) || 0) + (Number(form.service_charge) || 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" /> Create Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Tenant / Lease *</Label>
            <select value={selectedLeaseId} onChange={e => setSelectedLeaseId(e.target.value)}
              className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3">
              <option value="">Select a lease...</option>
              {leases.map(l => (
                <option key={l.id} value={l.id}>
                  {l.tenants?.tenant_type === 'company' 
                    ? (l.tenants?.company_name ?? l.tenants?.contact_person)
                    : `${l.tenants?.first_name} ${l.tenants?.last_name}`} — {l.units?.unit_code} ({l.units?.buildings?.name})
                </option>
              ))}
            </select>
          </div>

          {selectedLease && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-blue-800">
                    {selectedLease.tenants?.tenant_type === 'company' 
                      ? selectedLease.tenants?.company_name 
                      : `${selectedLease.tenants?.first_name} ${selectedLease.tenants?.last_name}`}
                  </p>
                  <p className="text-blue-600">{selectedLease.units?.unit_code} · {selectedLease.units?.buildings?.name}</p>
                </div>
                {selectedLease.tenants?.user_id && (
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-[10px] font-bold uppercase tracking-wider">
                    App User
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Invoice Date</Label>
              <Input type="date" value={form.invoice_date}
                onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Due Date</Label>
              <Input type="date" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Rent Amount *</Label>
              <Input type="number" placeholder="0.00" value={form.rent_amount}
                onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Service Charge</Label>
              <Input type="number" placeholder="0.00" value={form.service_charge}
                onChange={e => setForm(f => ({ ...f, service_charge: e.target.value }))}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Total Invoice Amount</span>
              <span className="text-xl font-bold text-gray-900">${total.toLocaleString()}</span>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">Notes</Label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Payment instructions, bank details..."
              className="w-full h-16 text-sm rounded-lg border border-gray-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
