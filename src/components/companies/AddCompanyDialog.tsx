'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Building2 } from 'lucide-react'

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

export default function AddCompanyDialog({ open, onClose, onSaved }: Props) {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [form, setForm] = useState({
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
      const { error: e } = await supabase.from('tenants').insert(dbVal({
        organization_id: orgId!,
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
      setForm({ company_name: '', company_reg_number: '', vat_number: '', industry: '',
        company_size: '', contact_person: '', contact_role: '', primary_phone: '', email: '', notes: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" /> Add Company
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Company details */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Company Details</p>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Company Name *</Label>
              <Input placeholder="Acme Corp Ltd" value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Registration No.</Label>
                <Input placeholder="RC123456" value={form.company_reg_number}
                  onChange={e => set('company_reg_number', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">VAT Number</Label>
                <Input placeholder="VAT-000-000" value={form.vat_number}
                  onChange={e => set('vat_number', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Industry</Label>
                <select value={form.industry} onChange={e => set('industry', e.target.value)}
                  className="w-full h-9 text-sm rounded-lg border border-gray-200 bg-white px-3">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Company Size</Label>
                <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                  className="w-full h-9 text-sm rounded-lg border border-gray-200 bg-white px-3">
                  <option value="">Select size</option>
                  {SIZES.map(s => <option key={s}>{s} employees</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Contact Person</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</Label>
                <Input placeholder="John Doe" value={form.contact_person}
                  onChange={e => set('contact_person', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Role / Title</Label>
                <Input placeholder="CEO, Finance Manager..." value={form.contact_role}
                  onChange={e => set('contact_role', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Phone</Label>
                <Input placeholder="+237 6XX XXX XXX" value={form.primary_phone}
                  onChange={e => set('primary_phone', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Email</Label>
                <Input placeholder="billing@company.com" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">Notes</Label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes..."
              className="w-full h-20 text-sm rounded-lg border border-gray-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Add Company'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

