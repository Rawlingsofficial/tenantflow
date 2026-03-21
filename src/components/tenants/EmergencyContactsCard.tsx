'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Phone, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { TenantEmergencyContact } from '@/types'

interface Props {
  tenantId: string
  contacts: TenantEmergencyContact[]
  onUpdated: (contacts: TenantEmergencyContact[]) => void
}

const emptyForm = { full_name: '', phone: '', relationship: '' }

export default function EmergencyContactsCard({ tenantId, contacts, onUpdated }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })) }

  function startAdd() { setForm(emptyForm); setEditId(null); setAdding(true); setError('') }

  function startEdit(contact: TenantEmergencyContact) {
    setForm({ full_name: contact.full_name ?? '', phone: contact.phone ?? '', relationship: contact.relationship ?? '' })
    setEditId(contact.id); setAdding(true); setError('')
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setError('Name is required'); return }
    setLoading(true); setError('')
    try {
      if (editId) {
        const { data, error: err } = await (supabase as any)
          .from('tenant_emergency_contacts')
          .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null, relationship: form.relationship.trim() || null })
          .eq('id', editId).select().single() as { data: TenantEmergencyContact | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onUpdated(contacts.map((c) => c.id === editId ? data : c))
      } else {
        const { data, error: err } = await supabase
          .from('tenant_emergency_contacts')
          .insert({ tenant_id: tenantId, full_name: form.full_name.trim(), phone: form.phone.trim() || null, relationship: form.relationship.trim() || null } as any)
          .select().single() as { data: TenantEmergencyContact | null; error: any }
        if (err || !data) throw new Error(err?.message)
        onUpdated([...contacts, data])
      }
      setAdding(false); setEditId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setLoading(false) }
  }

  async function handleDelete(contactId: string) {
    await supabase.from('tenant_emergency_contacts').delete().eq('id', contactId)
    onUpdated(contacts.filter((c) => c.id !== contactId))
  }

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contacts</CardTitle>
          {!adding && (
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={startAdd}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {adding && (
          <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Full name *</Label>
                <Input placeholder="Jane Doe" className="h-8 text-xs rounded-lg border-gray-200"
                  value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Phone</Label>
                <Input placeholder="+237 6XX XXX XXX" className="h-8 text-xs rounded-lg border-gray-200"
                  value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Relationship</Label>
              <Input placeholder="e.g. Spouse, Parent, Sibling" className="h-8 text-xs rounded-lg border-gray-200"
                value={form.relationship} onChange={(e) => set('relationship', e.target.value)} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : editId ? 'Save' : 'Add contact'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg"
                onClick={() => { setAdding(false); setEditId(null) }}>Cancel</Button>
            </div>
          </div>
        )}

        {contacts.length === 0 && !adding ? (
          <p className="text-xs text-gray-400 text-center py-4">No emergency contacts added</p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="flex items-start justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contact.full_name}</p>
                  {contact.relationship && (
                    <p className="text-xs text-emerald-600 font-medium">{contact.relationship}</p>
                  )}
                  {contact.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(contact)}>
                  <Pencil className="h-3 w-3 text-gray-400" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDelete(contact.id)}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}


