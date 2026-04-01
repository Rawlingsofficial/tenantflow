'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, FileText, Trash2, Loader2, Eye, Image, 
  File, Plus, Pencil, Phone, User, ExternalLink,
  PlusCircle, Shield, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import type { TenantDocument, TenantEmergencyContact } from '@/types'
import { cn } from '@/lib/utils'

// ─── Documents Card ───────────────────────────────────────────

const DOC_TYPES = ['National ID','Passport','Driver License','Passport Photo','Employment Letter','Birth Certificate','Residence Permit','Other']
const ACCEPTED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].join(',')

function FileIcon({ url }: { url: string | null }) {
  if (!url) return <File className="h-5 w-5 text-slate-400" />
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) return <Image className="h-5 w-5 text-teal-500" />
  if (/\.pdf$/i.test(url)) return <FileText className="h-5 w-5 text-rose-500" />
  return <File className="h-5 w-5 text-slate-400" />
}

interface DocsProps {
  tenantId: string
  documents: TenantDocument[]
  onUpdated: (docs: TenantDocument[]) => void
}

export function DocumentsCard({ tenantId, documents, onUpdated }: DocsProps) {
  const supabase = useSupabaseWithAuth()
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
      if (uploadErr) throw uploadErr
      
      const { data: urlData } = supabase.storage.from('tenant-documents').getPublicUrl(fileName)
      const { data: doc, error: docErr } = await (supabase as any).from('tenant_documents')
        .insert({ tenant_id: tenantId, document_type: selectedType, file_url: urlData.publicUrl } as any)
        .select().single()
      
      if (docErr) throw docErr
      onUpdated([...documents, doc as TenantDocument]); setError('')
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(doc: TenantDocument) {
    if (!confirm('Permanently delete this document?')) return
    try {
      if (doc.file_url) {
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/tenant-documents/')
        if (pathParts.length > 1) await supabase.storage.from('tenant-documents').remove([pathParts[1].split('?')[0]])
      }
      const { error: dbErr } = await (supabase as any).from('tenant_documents').delete().eq('id', doc.id)
      if (dbErr) throw dbErr
      onUpdated(documents.filter((d) => d.id !== doc.id))
    } catch (err) { console.error('Delete failed:', err) }
  }

  return (
    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal-600" /> Vital Documents
        </h3>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 rounded-xl border-slate-200 font-bold text-slate-600 text-[10px] uppercase tracking-wider"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Plus className="h-3 w-3 mr-1.5" />}
          Add New
        </Button>
        <input ref={fileRef} type="file" className="hidden" accept={ACCEPTED} onChange={handleUpload} />
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex gap-2 mb-6">
          <select 
            className="flex-1 h-10 px-4 text-sm font-semibold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700"
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/30">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-3">
              <Upload className="h-6 w-6 text-slate-200" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No documents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <motion.div 
                key={doc.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-teal-200 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                    <FileIcon url={doc.file_url} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{doc.document_type}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 truncate">
                      {doc.file_url?.split('/').pop()?.split('_').pop()?.split('?')[0] || 'View file'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.file_url && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50" onClick={() => window.open(doc.file_url!, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-4 w-4" />
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
  const supabase = useSupabaseWithAuth()
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
          .eq('id', editId).select().single()
        if (err) throw err
        onUpdated(contacts.map((c) => c.id === editId ? data as TenantEmergencyContact : c))
      } else {
        const { data, error: err } = await (supabase as any)
          .from('tenant_emergency_contacts')
          .insert({ tenant_id: tenantId, full_name: form.full_name.trim(), phone: form.phone.trim() || null, relationship: form.relationship.trim() || null } as any)
          .select().single()
        if (err) throw err
        onUpdated([...contacts, data as TenantEmergencyContact])
      }
      setAdding(false); setEditId(null)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally { setLoading(false) }
  }

  async function handleDelete(contactId: string) {
    if (!confirm('Delete this contact?')) return
    await (supabase as any).from('tenant_emergency_contacts').delete().eq('id', contactId)
    onUpdated(contacts.filter((c) => c.id !== contactId))
  }

  const inputClass = "h-10 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"

  return (
    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-600" /> Emergency Contacts
        </h3>
        {!adding && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 rounded-xl border-slate-200 font-bold text-slate-600 text-[10px] uppercase tracking-wider" 
            onClick={startAdd}
          >
            <Plus className="h-3 w-3 mr-1.5" /> Add
          </Button>
        )}
      </div>

      <div className="p-6">
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100 space-y-4 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Full Name *</Label>
                    <Input placeholder="e.g. Jane Doe" className={inputClass} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone</Label>
                    <Input placeholder="+1 (555) 000-0000" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Relationship</Label>
                  <Input placeholder="e.g. Spouse, Parent, Lawyer" className={inputClass} value={form.relationship} onChange={(e) => set('relationship', e.target.value)} />
                </div>
                
                {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 shadow-sm" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? 'Update Contact' : 'Save Contact'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 rounded-xl text-slate-500 font-bold text-xs px-4" onClick={() => { setAdding(false); setEditId(null) }}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {contacts.length === 0 && !adding ? (
          <div className="py-10 text-center bg-slate-50/30 border-2 border-dashed border-slate-100 rounded-[24px]">
            <Phone className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No contacts added</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <motion.div 
                key={contact.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-teal-200 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{contact.full_name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mt-1">{contact.relationship || 'Contact'}</p>
                    {contact.phone && (
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1.5">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50" onClick={() => startEdit(contact)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="h-4 w-4" />
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

// ─── Default exports for backward compat ─────────────────────
export default DocumentsCard
