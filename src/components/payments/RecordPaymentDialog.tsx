'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Loader2, X, CreditCard, Search, 
  CheckCircle2, DollarSign, Calendar,
  User, Building2, ArrowRight, AlertCircle
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { HouseIcon, BuildingIcon } from '@/components/ui/portfolio-icons'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function RecordPaymentDialog({ open, onClose, onSaved, organizationId, preselectedLeaseId }: Props) {
  const supabase = useSupabaseWithAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [leases,  setLeases]  = useState<any[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState(preselectedLeaseId ?? '')
  const [search,  setSearch]  = useState('')

  const [form, setForm] = useState<PayForm>({
    amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '',
  })

  const loadLeases = useCallback(async () => {
    if (!organizationId) return
    try {
      const { data } = await (supabase as any)
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
    } catch (err) {
      console.error('Error loading leases:', err)
    }
  }, [organizationId, supabase, preselectedLeaseId])

  useEffect(() => {
    if (open) {
      setError('')
      setSelectedLeaseId(preselectedLeaseId ?? '')
      setForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'cash', reference: '' })
      loadLeases()
    }
  }, [open, loadLeases, preselectedLeaseId])

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
      const { error: err } = await (supabase as any).from('rent_payments').insert({
        lease_id: selectedLeaseId,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        method: form.method || null,
        reference: form.reference.trim() || null,
        status: 'completed',
      } as any)
      
      if (err) throw err
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
    } finally { setLoading(false) }
  }

  const labelClass = "text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 mb-2 block"
  const inputClass = "h-12 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-teal-500/20 transition-all font-semibold text-slate-700"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[32px] border-slate-200/80 shadow-2xl bg-white flex flex-col max-h-[92vh]">

        {/* Header Region */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/30">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1B3B6F] shadow-lg shadow-[#1B3B6F]/20 text-white">
              <CreditCard className="h-6 w-6 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Record Rent Payment</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">Efficiently log incoming revenue for auditing.</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">

          {/* Lease selector */}
          {!preselectedLeaseId && (
            <div className="space-y-4">
              <Label className={labelClass}>Identify Active Lease</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search tenant or unit..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-11 text-sm rounded-xl border-slate-200 bg-slate-50 focus:bg-white" 
                />
              </div>
              <div className="border border-slate-200 rounded-[24px] overflow-hidden max-h-52 overflow-y-auto shadow-inner bg-slate-50/30">
                {filteredLeases.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium italic">No active matching leases found</div>
                ) : filteredLeases.map(l => {
                  const t   = l.tenants
                  const isC = t?.tenant_type === 'company'
                  const name = isC ? (t?.company_name ?? '—') : `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim()
                  const init = isC ? (t?.company_name ?? 'C')[0].toUpperCase() : `${t?.first_name?.[0] ?? ''}${t?.last_name?.[0] ?? ''}`.toUpperCase()
                  const bt   = l.units?.buildings?.building_type
                  const isSelected = selectedLeaseId === l.id

                  return (
                    <button key={l.id}
                      onClick={() => { setSelectedLeaseId(l.id); setForm(f => ({ ...f, amount: String(l.rent_amount) })) }}
                      className={cn("w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all border-b border-slate-100 last:border-0",
                        isSelected ? 'bg-teal-50' : 'hover:bg-white'
                      )}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                        isSelected ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-400"
                      )}>{init || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500 font-medium">{l.units?.unit_code} · {l.units?.buildings?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-black text-teal-700">${Number(l.rent_amount).toLocaleString()}</span>
                        {bt && (
                          <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                            bt === 'commercial' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            {bt === 'commercial' ? <BuildingIcon className="w-2.5 h-2.5" /> : <HouseIcon className="w-2.5 h-2.5" />}
                            {bt}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected Context */}
          {selectedLease && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-teal-900 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl"
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <User className="h-6 w-6 text-teal-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-0.5">Active Tenant</p>
                    <h4 className="text-lg font-bold leading-none">
                      {selectedLease.tenants?.tenant_type === 'company' 
                        ? selectedLease.tenants?.company_name 
                        : `${selectedLease.tenants?.first_name} ${selectedLease.tenants?.last_name}`}
                    </h4>
                    <p className="text-xs text-white/60 mt-1 font-medium">{selectedLease.units?.unit_code} • {selectedLease.units?.buildings?.name}</p>
                  </div>
                </div>
                <div className="text-right border-l border-white/10 pl-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-0.5">Base Rent</p>
                  <p className="text-2xl font-black">${Number(selectedLease.rent_amount).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={labelClass}>Amount Received *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="0.00" 
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={cn(inputClass, "pl-8 font-black text-slate-900")} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className={labelClass}>Payment Date *</Label>
              <Input 
                type="date" 
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className={cn(inputClass, "font-bold")} 
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Payment Method</Label>
              <Select value={form.method} onValueChange={(v: string | null) => { if (v) setForm(f => ({ ...f, method: v })); }}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1">
                  {['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other'].map(m => (
                    <SelectItem key={m} value={m} className="rounded-xl py-2.5 font-semibold capitalize">
                      {m.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Reference / Transaction ID</Label>
              <Input 
                placeholder="e.g. TXN-10293" 
                value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className={cn(inputClass, "font-mono text-xs uppercase")} 
              />
            </div>
          </div>

          {error && (
            <div className="px-5 py-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800">Recording Error</p>
                <p className="text-sm text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 bg-slate-50/50">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="h-11 px-6 text-sm rounded-xl text-slate-500 hover:text-slate-700 font-medium">Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-teal-600/20 gap-2 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
            Confirm Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
