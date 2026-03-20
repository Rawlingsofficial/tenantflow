'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, Loader2, Eye, Image, File } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { TenantDocument } from '@/types'

interface Props {
  tenantId: string
  documents: TenantDocument[]
  onUpdated: (docs: TenantDocument[]) => void
}

const DOC_TYPES = [
  'National ID',
  'Passport',
  'Driver License',
  'Passport Photo',
  'Employment Letter',
  'Birth Certificate',
  'Residence Permit',
  'Other',
]

// Accepted file types
const ACCEPTED = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

function FileIcon({ url, type }: { url: string | null; type: string | null }) {
  if (!url) return <File className="h-4 w-4 text-slate-400" />
  
  const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
  const isPdf = /\.pdf$/i.test(url)
  
  if (isImg) return <Image className="h-4 w-4 text-indigo-400" />
  if (isPdf) return <FileText className="h-4 w-4 text-red-400" />
  return <File className="h-4 w-4 text-slate-400" />
}

export default function DocumentsCard({ tenantId, documents, onUpdated }: Props) {
  const supabase = getSupabaseBrowserClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('National ID')
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size — max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Clean filename — remove spaces and special chars
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${tenantId}/${Date.now()}_${cleanName}`

      console.log('Uploading to bucket: tenant-documents, path:', fileName)

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('tenant-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      console.log('Upload result:', { uploadData, uploadErr })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tenant-documents')
        .getPublicUrl(fileName)

      console.log('Public URL:', urlData.publicUrl)

      // Save document record
      const { data: doc, error: docErr } = await supabase
        .from('tenant_documents')
        .insert({
          tenant_id: tenantId,
          document_type: selectedType,
          file_url: urlData.publicUrl,
        } as any)
        .select()
        .single() as { data: TenantDocument | null; error: any }

      if (docErr || !doc) throw new Error(docErr?.message || 'Failed to save document record')
      
      onUpdated([...documents, doc])
      setError('')
    } catch (err: unknown) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(doc: TenantDocument) {
    try {
      if (doc.file_url) {
        // Extract path after bucket name
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/tenant-documents/')
        if (pathParts.length > 1) {
          const storagePath = pathParts[1].split('?')[0]
          console.log('Deleting from storage:', storagePath)
          const { error: storageErr } = await supabase.storage
            .from('tenant-documents')
            .remove([storagePath])
          if (storageErr) console.warn('Storage delete warning:', storageErr.message)
        }
      }
      
      const { error: dbErr } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', doc.id)
      
      if (dbErr) throw new Error(dbErr.message)
      onUpdated(documents.filter((d) => d.id !== doc.id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const isImage = (url: string) =>
    /\.(jpg|jpeg|png|webp|gif)$/i.test(url)

  return (
    <Card className="border border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              className="flex-1 h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Uploading...</>
                : <><Upload className="h-3 w-3 mr-1" />Upload</>
              }
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ACCEPTED}
              onChange={handleUpload}
            />
          </div>
          <p className="text-xs text-slate-400">
            Accepts: JPG, PNG, PDF, DOC, DOCX · Max 10MB
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No documents uploaded yet</p>
            <button
              className="text-xs text-indigo-500 hover:text-indigo-600 mt-1"
              onClick={() => fileRef.current?.click()}
            >
              Upload first document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Preview thumbnail for images */}
                  {doc.file_url && isImage(doc.file_url) ? (
                    <img
                      src={doc.file_url}
                      alt={doc.document_type ?? 'document'}
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <FileIcon url={doc.file_url} type={doc.document_type} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {doc.document_type}
                    </p>
                    <p className="text-xs text-slate-400 truncate max-w-[160px]">
                      {doc.file_url?.split('/').pop()?.split('?')[0] ?? 'file'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {doc.file_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => window.open(doc.file_url!, '_blank')}
                      title="View document"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(doc)}
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
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

