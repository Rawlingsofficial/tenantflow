'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Building2, User, Phone, Mail, X, Briefcase, Hash, Receipt } from 'lucide-react'

function dbVal<T>(v: T): never { return v as never }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Retail',
  'Manufacturing', 'Legal', 'Education', 'Media & Marketing',
  'Logistics', 'Hospitality', 'Construction', 'Consulting', 'Other'
]
const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-[#1B3B6F]/8 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-[#1B3B6F]" />
      </div>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

export default function AddCompanyDialog({ open, onClose, onSaved }: Props) {
  const { orgId, getToken } = useAuth()
  const supabase = useSupabaseWithAuth()

  const [form, setForm] = useState({
    user_id: '',
    company_name: '', company_reg_number: '', vat_number: '',
    industry: '', company_size: '', contact_person: '', contact_role: '',
    primary_phone: '', email: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setSaving(true); setError('')
    try {
      let internalUserId = null;
      if (form.user_id.trim()) {
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('id')
          .eq('clerk_user_id', form.user_id.trim())
          .maybeSingle();
        
        if (userError) throw userError;
        if (!userData) {
          setError('Tenant App ID not found. Please make sure the company representative has signed up for the app.');
          setSaving(false);
          return;
        }
        internalUserId = (userData as any).id;
      }

      const { error: e } = await supabase.from('tenants').insert(dbVal({
        organization_id: orgId!,
        user_id: internalUserId,
        tenant_type: 'company',
        company_name: form.company_name.trim(),
        company_reg_number: form.company_reg_number || null,
        vat_number: form.vat_number || null,
        industry: form.industry || null,
        company_size: form.company_size || null,
        contact_person: form.contact_person || null,
        contact_role: form.contact_role || null,
        primary_phone: form.primary_phone || null,
        email: form.email || null,
        notes: form.notes || null,
        status: 'active',
        first_name: form.contact_person.split(' ')[0] || null,
        last_name: form.contact_person.split(' ').slice(1).join(' ') || null,
      }))
      if (e) throw new Error(e.message)
      onSaved()
      setForm({ user_id: '', company_name: '', company_reg_number: '', vat_number: '', industry: '',
        company_size: '', contact_person: '', contact_role: '', primary_phone: '', email: '', notes: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  const selectClass = "w-full h-9 text-sm rounded-xl border border-slate-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 text-slate-700"
  const inputClass  = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#1B3B6F]/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <Building2 className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Add Company</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Register a commercial tenant</p>
            </div>
          </div>
          <button onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* System ID */}
          <div>
            <Label className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider mb-1.5 block">
              System ID (Tenant App ID) <span className="text-slate-400 font-normal lowercase tracking-normal">(optional)</span>
            </Label>
            <Input placeholder="Leave blank if representative hasn't registered yet..." value={form.user_id}
              onChange={(e) => set('user_id', e.target.value)} className={`${inputClass} border-teal-100 bg-teal-50/30`} />
            <p className="text-[10px] text-slate-400 mt-1">If left blank, it will auto-link later when they register with the same email.</p>
          </div>

          {/* Company details */}
          <div>
            <SectionHeader icon={Building2} label="Company Details" />
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Company Name <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input placeholder="Acme Corp Ltd" value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Registration No.</span>
                  </Label>
                  <Input placeholder="RC123456" value={form.company_reg_number}
                    onChange={e => set('company_reg_number', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> VAT Number</span>
                  </Label>
                  <Input placeholder="VAT-000-000" value={form.vat_number}
                    onChange={e => set('vat_number', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Industry</Label>
                  <Select value={form.industry} onValueChange={(v: string | null) => set('industry', v ?? '')}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select industry…" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Company Size</Label>
                  <Select value={form.company_size} onValueChange={(v: string | null) => set('company_size', v ?? '')}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select size…" /></SelectTrigger>
                    <SelectContent>
                      {SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Contact person */}
          <div>
            <SectionHeader icon={User} label="Contact Person" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Full Name</Label>
                  <Input placeholder="John Doe" value={form.contact_person}
                    onChange={e => set('contact_person', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Role / Title</Label>
                  <Input placeholder="CEO, Finance Manager…" value={form.contact_role}
                    onChange={e => set('contact_role', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="+237 6XX XXX XXX" value={form.primary_phone}
                      onChange={e => set('primary_phone', e.target.value)} className={`${inputClass} pl-9`} />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="billing@company.com" value={form.email}
                      onChange={e => set('email', e.target.value)} className={`${inputClass} pl-9`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</Label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes about this company…"
              className="w-full h-20 text-sm rounded-xl border border-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 text-slate-800 placeholder-slate-400" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}
            className="h-9 bg-[#1B3B6F] hover:bg-[#162d52] text-white text-sm rounded-xl px-6 font-semibold shadow-sm">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              : 'Add Company'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


