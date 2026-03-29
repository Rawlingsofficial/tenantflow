'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, X, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (tenant: Tenant) => void
  tenant: Tenant
}

export default function EditTenantDialog({ open, onClose, onSaved, tenant }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  const [form, setForm] = useState({
    user_id: '', first_name: '', last_name: '', primary_phone: '', secondary_phone: '',
    email: '', country: '', occupation: '', employment_type: '',
    employer_name: '', work_address: '', date_of_birth: '', marital_status: '', notes: '',
  })

  useEffect(() => {
    if (open && tenant) {
      setForm({
        user_id: tenant.user_id ?? '',
        first_name: tenant.first_name ?? '', last_name: tenant.last_name ?? '',
        primary_phone: tenant.primary_phone ?? '', secondary_phone: tenant.secondary_phone ?? '',
        email: tenant.email ?? '', country: tenant.country ?? '',
        occupation: tenant.occupation ?? '', employment_type: tenant.employment_type ?? '',
        employer_name: tenant.employer_name ?? '', work_address: tenant.work_address ?? '',
        date_of_birth: tenant.date_of_birth ?? '', marital_status: tenant.marital_status ?? '',
        notes: tenant.notes ?? '',
      })
      setError('')
    }
  }, [open, tenant])

  function set(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })) }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setLoading(true); setError('')
    try {
      const { data, error: err } = await (supabase as any)
        .from('tenants').update({
          user_id: form.user_id.trim() || null,
          first_name: form.first_name.trim(), last_name: form.last_name.trim() || null,
          primary_phone: form.primary_phone.trim() || null, secondary_phone: form.secondary_phone.trim() || null,
          email: form.email.trim() || null, country: form.country.trim() || null,
          occupation: form.occupation.trim() || null, employment_type: form.employment_type || null,
          employer_name: form.employer_name.trim() || null, work_address: form.work_address.trim() || null,
          date_of_birth: form.date_of_birth || null, marital_status: form.marital_status || null,
          notes: form.notes.trim() || null,
        }).eq('id', tenant.id).select().single() as { data: Tenant | null; error: any }
      if (err || !data) throw new Error(err?.message)
      onSaved(data); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setLoading(false) }
  }

  const inputClass = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <User className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Edit Tenant</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {`${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || 'Update tenant information'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <Label className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider mb-1.5 block">
              System ID (Tenant App ID)
            </Label>
            <Input placeholder="Enter the Tenant's Clerk ID from their app..." value={form.user_id}
              onChange={(e) => set('user_id', e.target.value)} className={`${inputClass} border-teal-100 bg-teal-50/30`} />
            <p className="text-[10px] text-slate-400 mt-1">Linking this ID allows the tenant to access their lease and payments in the tenant app.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'First name *', field: 'first_name', placeholder: 'John' },
              { label: 'Last name', field: 'last_name', placeholder: 'Doe' },
              { label: 'Primary phone', field: 'primary_phone', placeholder: '+237 6XX XXX XXX' },
              { label: 'Email', field: 'email', placeholder: 'john@example.com', type: 'email' },
              { label: 'Occupation', field: 'occupation', placeholder: 'e.g. Engineer' },
              { label: 'Country', field: 'country', placeholder: 'e.g. Cameroon' },
            ].map(({ label, field, placeholder, type }) => (
              <div key={field}>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</Label>
                <Input type={type} placeholder={placeholder} value={(form as any)[field]} onChange={(e) => set(field, e.target.value)} className={inputClass} />
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors">
            <motion.div animate={{ rotate: showOptional ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
            {showOptional ? 'Hide' : 'Show'} optional fields
          </button>

          <AnimatePresence>
            {showOptional && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Secondary phone</Label>
                    <Input value={form.secondary_phone} onChange={(e) => set('secondary_phone', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Date of birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Marital status</Label>
                    <Select value={form.marital_status}
                      // @ts-ignore
                      onValueChange={(v: string) => set('marital_status', v ?? '')}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Employment type</Label>
                    <Select value={form.employment_type}
                      // @ts-ignore
                      onValueChange={(v: string) => set('employment_type', v ?? '')}>
                      <SelectTrigger className="h-9 text-sm rounded-xl border-slate-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="self_employed">Self-employed</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Employer name</Label>
                    <Input value={form.employer_name} onChange={(e) => set('employer_name', e.target.value)} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Internal notes</Label>
                    <textarea className="w-full min-h-[80px] px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"
                      placeholder="Private notes about this tenant…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-6 font-semibold shadow-sm">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


