'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
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
    first_name: '',
    last_name: '',
    primary_phone: '',
    secondary_phone: '',
    email: '',
    country: '',
    occupation: '',
    employment_type: '',
    employer_name: '',
    work_address: '',
    date_of_birth: '',
    marital_status: '',
    notes: '',
  })

  useEffect(() => {
    if (open && tenant) {
      setForm({
        first_name: tenant.first_name ?? '',
        last_name: tenant.last_name ?? '',
        primary_phone: tenant.primary_phone ?? '',
        secondary_phone: tenant.secondary_phone ?? '',
        email: tenant.email ?? '',
        country: tenant.country ?? '',
        occupation: tenant.occupation ?? '',
        employment_type: tenant.employment_type ?? '',
        employer_name: tenant.employer_name ?? '',
        work_address: tenant.work_address ?? '',
        date_of_birth: tenant.date_of_birth ?? '',
        marital_status: tenant.marital_status ?? '',
        notes: tenant.notes ?? '',
      })
      setError('')
    }
  }, [open, tenant])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setLoading(true)
    setError('')

    try {
     const { data, error: err } = await (supabase as any)
  .from('tenants')
  .update({
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
        })
        .eq('id', tenant.id)
        .select()
        .single() as { data: Tenant | null; error: any }

      if (err || !data) throw new Error(err?.message)
      onSaved(data)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First name *</Label>
              <Input
                placeholder="John"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                placeholder="Doe"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Primary phone</Label>
              <Input
                placeholder="+237 6XX XXX XXX"
                value={form.primary_phone}
                onChange={(e) => set('primary_phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Occupation</Label>
              <Input
                placeholder="e.g. Engineer"
                value={form.occupation}
                onChange={(e) => set('occupation', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                placeholder="e.g. Cameroon"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
            {showOptional ? 'Hide' : 'Show'} optional fields
          </button>

          {showOptional && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Secondary phone</Label>
                  <Input
                    value={form.secondary_phone}
                    onChange={(e) => set('secondary_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set('date_of_birth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Marital status</Label>
                  <Select
                    value={form.marital_status}
                    onValueChange={(v) => set('marital_status', v ?? '')}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment type</Label>
                  <Select
                    value={form.employment_type}
                    onValueChange={(v) => set('employment_type', v ?? '')}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self_employed">Self-employed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Employer name</Label>
                <Input
                  value={form.employer_name}
                  onChange={(e) => set('employer_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Work address</Label>
                <Input
                  value={form.work_address}
                  onChange={(e) => set('work_address', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Internal notes</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Private notes about this tenant..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          )}

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
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : 'Save changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
