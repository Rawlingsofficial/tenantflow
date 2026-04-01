'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, Loader2, Eye, Image, File } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import type { TenantDocument } from '@/types'

interface Props {
  tenantId: string
  documents: TenantDocument[]
  onUpdated: (docs: TenantDocument[]) => void
}

const DOC_TYPES = ['National ID','Passport','Driver License','Passport Photo','Employment Letter','Birth Certificate','Residence Permit','Other']
const ACCEPTED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].join(',')

function FileIcon({ url, type }: { url: string | null; type: string | null }) {
  if (!url) return <File className="h-4 w-4 text-gray-400" />
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(url)) return <Image className="h-4 w-4 text-emerald-500" />
  if (/\.pdf$/i.test(url)) return <FileText className="h-4 w-4 text-red-400" />
  return <File className="h-4 w-4 text-gray-400" />
}

export default function DocumentsCard({ tenantId, documents, onUpdated }: Props) {
  const supabase = useSupabaseWithAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('National ID')
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum size is 10MB.'); return }
    setUploading(true)
    setError('')
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${tenantId}/${Date.now()}_${cleanName}`
      const { error: uploadErr } = await supabase.storage.from('tenant-documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
      const { data: urlData } = supabase.storage.from('tenant-documents').getPublicUrl(fileName)
      const { data: doc, error: docErr } = await supabase.from('tenant_documents')
        .insert({ tenant_id: tenantId, document_type: selectedType, file_url: urlData.publicUrl } as any)
        .select().single() as { data: TenantDocument | null; error: any }
      if (docErr || !doc) throw new Error(docErr?.message || 'Failed to save document record')
      onUpdated([...documents, doc])
      setError('')
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
        if (pathParts.length > 1) {
          await supabase.storage.from('tenant-documents').remove([pathParts[1].split('?')[0]])
        }
      }
      const { error: dbErr } = await supabase.from('tenant_documents').delete().eq('id', doc.id)
      if (dbErr) throw new Error(dbErr.message)
      onUpdated(documents.filter((d) => d.id !== doc.id))
    } catch (err) { console.error('Delete failed:', err) }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url)

  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select className="flex-1 h-9 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700"
              value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button size="sm" variant="outline" className="h-9 text-xs shrink-0 rounded-lg"
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</> : <><Upload className="h-3 w-3 mr-1" />Upload</>}
            </Button>
            <input ref={fileRef} type="file" className="hidden" accept={ACCEPTED} onChange={handleUpload} />
          </div>
          <p className="text-xs text-gray-400">Accepts: JPG, PNG, PDF, DOC · Max 10MB</p>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

        {documents.length === 0 ? (
          <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No documents uploaded yet</p>
            <button className="text-xs text-emerald-600 hover:text-emerald-700 mt-1" onClick={() => fileRef.current?.click()}>
              Upload first document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  {doc.file_url && isImage(doc.file_url) ? (
                    <img src={doc.file_url} alt={doc.document_type ?? 'document'} className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <FileIcon url={doc.file_url} type={doc.document_type} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{doc.document_type}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{doc.file_url?.split('/').pop()?.split('?')[0] ?? 'file'}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {doc.file_url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(doc.file_url!, '_blank')}>
                      <Eye className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
