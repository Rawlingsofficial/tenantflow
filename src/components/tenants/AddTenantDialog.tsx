'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, User, Briefcase, Phone, Mail, MapPin, FileText, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant } from '@/types'

interface AddTenantDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tenant: Tenant) => void
  organizationId: string
  editTenant?: Tenant | null
}

function SectionHeader({ icon: Icon, label, color = 'text-teal-600', bg = 'bg-teal-50' }: {
  icon: any; label: string; color?: string; bg?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

export default function AddTenantDialog({ open, onClose, onSaved, organizationId, editTenant }: AddTenantDialogProps) {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  const [form, setForm] = useState({
    user_id: editTenant?.user_id ?? '',
    first_name: editTenant?.first_name ?? '',
    last_name: editTenant?.last_name ?? '',
    primary_phone: editTenant?.primary_phone ?? '',
    secondary_phone: editTenant?.secondary_phone ?? '',
    email: editTenant?.email ?? '',
    country: editTenant?.country ?? '',
    occupation: editTenant?.occupation ?? '',
    employment_type: editTenant?.employment_type ?? '',
    employer_name: editTenant?.employer_name ?? '',
    work_address: editTenant?.work_address ?? '',
    date_of_birth: editTenant?.date_of_birth ?? '',
    marital_status: editTenant?.marital_status ?? '',
    notes: editTenant?.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setLoading(true)
    setError('')
    const payload = {
      user_id: form.user_id.trim() || null,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      primary_phone: form.primary_phone.trim() || null,
      secondary_phone: form.secondary_phone.trim() || null,
      email: form.email.trim() || null,
      country: form.country.trim() || null,
      occupation: form.occupation.trim() || null,
      employment_type: form.employment_type || null,
      employer_name: form.employer_name.trim() || null,
      work_address: form.work_address.trim() || null,
      date_of_birth: form.date_of_birth || null,
      marital_status: form.marital_status || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editTenant) {
        const { data, error: err } = await (supabase as any)
          .from('tenants').update(payload).eq('id', editTenant.id).select().single() as { data: Tenant | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onSaved(data)
      } else {
        const { data, error: err } = await supabase
          .from('tenants').insert({ ...payload, organization_id: organizationId } as any)
          .select().single() as { data: Tenant | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onSaved(data)
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <User className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">
                {editTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Fill in the tenant's details below</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Basic Info */}
          <div>
            <SectionHeader icon={User} label="Basic Information" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider mb-1.5 block">
                  System ID (Tenant App ID)
                </Label>
                <Input placeholder="Enter the Tenant's Clerk ID from their app..." value={form.user_id}
                  onChange={(e) => set('user_id', e.target.value)} className={`${inputClass} border-teal-100 bg-teal-50/30`} />
                <p className="text-[10px] text-slate-400 mt-1">Linking this ID allows the tenant to access their lease and payments in the tenant app.</p>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input placeholder="John" value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Last Name</Label>
                <Input placeholder="Doe" value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Country</Label>
                <Input placeholder="e.g. Cameroon" value={form.country}
                  onChange={(e) => set('country', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Date of Birth</Label>
                <Input type="date" value={form.date_of_birth}
                  onChange={(e) => set('date_of_birth', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <SectionHeader icon={Phone} label="Contact Details" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Primary Phone</Label>
                <Input placeholder="+237 6XX XXX XXX" value={form.primary_phone}
                  onChange={(e) => set('primary_phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</Label>
                <Input type="email" placeholder="john@example.com" value={form.email}
                  onChange={(e) => set('email', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div>
            <SectionHeader icon={Briefcase} label="Employment" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Occupation</Label>
                <Input placeholder="e.g. Engineer" value={form.occupation}
                  onChange={(e) => set('occupation', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Employment Type</Label>
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
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Employer Name</Label>
                <Input placeholder="e.g. Acme Corp" value={form.employer_name}
                  onChange={(e) => set('employer_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Marital Status</Label>
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
            </div>
          </div>

          {/* Optional toggle */}
          <button type="button" onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors">
            <motion.div animate={{ rotate: showOptional ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
            {showOptional ? 'Hide' : 'Show'} additional fields
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
                <div className="space-y-4 pt-1">
                  <SectionHeader icon={FileText} label="Additional Info" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Secondary Phone</Label>
                      <Input placeholder="+237 6XX XXX XXX" value={form.secondary_phone}
                        onChange={(e) => set('secondary_phone', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Work Address</Label>
                      <Input placeholder="e.g. 123 Business Ave" value={form.work_address}
                        onChange={(e) => set('work_address', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Internal Notes</Label>
                    <textarea
                      className="w-full min-h-[90px] px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 text-slate-800 placeholder-slate-400"
                      placeholder="Private notes about this tenant (not visible to tenant)..."
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-6 font-semibold shadow-sm">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              : editTenant ? 'Save Changes' : 'Add Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


