'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronDown, X, User } from 'lucide-react'
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
    first_name: '', last_name: '', primary_phone: '', secondary_phone: '',
    email: '', country: '', occupation: '', employment_type: '',
    employer_name: '', work_address: '', date_of_birth: '', marital_status: '', notes: '',
  })

  useEffect(() => {
    if (open && tenant) {
      setForm({
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <User className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">Edit Tenant</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">Update tenant information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">First name *</Label>
              <Input placeholder="John" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Last name</Label>
              <Input placeholder="Doe" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Primary phone</Label>
              <Input placeholder="+237 6XX XXX XXX" value={form.primary_phone} onChange={(e) => set('primary_phone', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Email</Label>
              <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Occupation</Label>
              <Input placeholder="e.g. Engineer" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Country</Label>
              <Input placeholder="e.g. Cameroon" value={form.country} onChange={(e) => set('country', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
            </div>
          </div>

          <button type="button" onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
            {showOptional ? 'Hide' : 'Show'} optional fields
          </button>

          {showOptional && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Secondary phone</Label>
                <Input value={form.secondary_phone} onChange={(e) => set('secondary_phone', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Date of birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Marital status</Label>
                <Select value={form.marital_status}
                  // @ts-ignore
                  onValueChange={(v: string) => set('marital_status', v ?? '')}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Employment type</Label>
                <Select value={form.employment_type}
                  // @ts-ignore
                  onValueChange={(v: string) => set('employment_type', v ?? '')}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200"><SelectValue placeholder="Select..." /></SelectTrigger>
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
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Employer name</Label>
                <Input value={form.employer_name} onChange={(e) => set('employer_name', e.target.value)} className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Internal notes</Label>
                <textarea className="w-full min-h-[80px] px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Private notes about this tenant..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-lg px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-6">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
