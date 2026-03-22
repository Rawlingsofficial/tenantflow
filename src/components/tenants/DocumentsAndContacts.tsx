'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Trash2, Loader2, Eye, Image, File, Plus, Pencil, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { TenantDocument, TenantEmergencyContact } from '@/types'

// ─── Documents Card ───────────────────────────────────────────

const DOC_TYPES = ['National ID','Passport','Driver License','Passport Photo','Employment Letter','Birth Certificate','Residence Permit','Other']
const ACCEPTED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].join(',')

function FileIcon({ url }: { url: string | null }) {
  if (!url) return <File className="h-4 w-4 text-slate-400" />
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) return <Image className="h-4 w-4 text-teal-500" />
  if (/\.pdf$/i.test(url)) return <FileText className="h-4 w-4 text-red-400" />
  return <File className="h-4 w-4 text-slate-400" />
}

interface DocsProps {
  tenantId: string
  documents: TenantDocument[]
  onUpdated: (docs: TenantDocument[]) => void
}

export function DocumentsCard({ tenantId, documents, onUpdated }: DocsProps) {
  const supabase = getSupabaseBrowserClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('National ID')
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum size is 10MB.'); return }
    setUploading(true); setError('')
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${tenantId}/${Date.now()}_${cleanName}`
      const { error: uploadErr } = await supabase.storage.from('tenant-documents').upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
      const { data: urlData } = supabase.storage.from('tenant-documents').getPublicUrl(fileName)
      const { data: doc, error: docErr } = await supabase.from('tenant_documents')
        .insert({ tenant_id: tenantId, document_type: selectedType, file_url: urlData.publicUrl } as any)
        .select().single() as { data: TenantDocument | null; error: any }
      if (docErr || !doc) throw new Error(docErr?.message || 'Failed to save document record')
      onUpdated([...documents, doc]); setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(doc: TenantDocument) {
    try {
      if (doc.file_url) {
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/tenant-documents/')
        if (pathParts.length > 1) await supabase.storage.from('tenant-documents').remove([pathParts[1].split('?')[0]])
      }
      const { error: dbErr } = await supabase.from('tenant_documents').delete().eq('id', doc.id)
      if (dbErr) throw new Error(dbErr.message)
      onUpdated(documents.filter((d) => d.id !== doc.id))
    } catch (err) { console.error('Delete failed:', err) }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url)

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documents</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <select className="flex-1 h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 text-slate-700"
            value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button size="sm" variant="outline" className="h-9 text-xs shrink-0 rounded-xl border-slate-200"
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading
              ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading…</>
              : <><Upload className="h-3 w-3 mr-1" />Upload</>}
          </Button>
          <input ref={fileRef} type="file" className="hidden" accept={ACCEPTED} onChange={handleUpload} />
        </div>
        <p className="text-[10px] text-slate-400">JPG, PNG, PDF, DOC · Max 10MB</p>

        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}

        {documents.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
            <FileText className="h-7 w-7 mx-auto mb-2 text-slate-300" />
            <p className="text-xs text-slate-400">No documents uploaded yet</p>
            <button className="text-xs text-teal-600 hover:text-teal-700 font-semibold mt-1" onClick={() => fileRef.current?.click()}>
              Upload first document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  {doc.file_url && isImage(doc.file_url) ? (
                    <img src={doc.file_url} alt={doc.document_type ?? 'document'} className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <FileIcon url={doc.file_url} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{doc.document_type}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[140px]">{doc.file_url?.split('/').pop()?.split('?')[0] ?? 'file'}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {doc.file_url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => window.open(doc.file_url!, '_blank')}>
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Emergency Contacts Card ──────────────────────────────────

interface ContactsProps {
  tenantId: string
  contacts: TenantEmergencyContact[]
  onUpdated: (contacts: TenantEmergencyContact[]) => void
}

const emptyForm = { full_name: '', phone: '', relationship: '' }

export function EmergencyContactsCard({ tenantId, contacts, onUpdated }: ContactsProps) {
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

  const inputClass = "h-8 text-xs rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency Contacts</p>
        {!adding && (
          <Button size="sm" variant="outline" className="h-7 text-xs rounded-xl border-slate-200 gap-1" onClick={startAdd}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Full name *</Label>
                    <Input placeholder="Jane Doe" className={inputClass} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Phone</Label>
                    <Input placeholder="+237 6XX XXX XXX" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Relationship</Label>
                  <Input placeholder="e.g. Spouse, Parent, Sibling" className={inputClass} value={form.relationship} onChange={(e) => set('relationship', e.target.value)} />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : editId ? 'Save' : 'Add contact'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-xl border-slate-200" onClick={() => { setAdding(false); setEditId(null) }}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {contacts.length === 0 && !adding ? (
          <p className="text-xs text-slate-400 text-center py-4">No emergency contacts added</p>
        ) : (
          contacts.map((contact) => (
            <motion.div key={contact.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B3B6F]/8 to-teal-500/8 border border-slate-200/60 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{contact.full_name}</p>
                  {contact.relationship && <p className="text-xs text-teal-600 font-medium">{contact.relationship}</p>}
                  {contact.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-lg" onClick={() => startEdit(contact)}>
                  <Pencil className="h-3 w-3 text-slate-400" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-lg" onClick={() => handleDelete(contact.id)}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Default exports for backward compat ─────────────────────
export default DocumentsCard
