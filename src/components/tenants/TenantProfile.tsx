'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase,
  Calendar, User, Archive, Plus, Pencil,
  AlertCircle, FileText, Camera, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { format } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type {
  Tenant, LeaseWithDetails,
  TenantEmergencyContact, TenantDocument
} from '@/types'
import EmergencyContactsCard from './EmergencyContactsCard'
import DocumentsCard from './DocumentsCard'

interface Props {
  tenant: Tenant
  leases: LeaseWithDetails[]
  contacts: TenantEmergencyContact[]
  documents: TenantDocument[]
  onEdit: () => void
  onArchive: () => void
  onCreateLease: () => void
  onContactsUpdated: (contacts: TenantEmergencyContact[]) => void
  onDocumentsUpdated: (docs: TenantDocument[]) => void
  onTenantUpdated: (tenant: Tenant) => void
}

const leaseStatusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  ended: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-600',
}

function InfoRow({
  icon: Icon, label, value
}: {
  icon: any
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="p-1 bg-slate-100 rounded shrink-0 mt-0.5">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function TenantProfile({
  tenant, leases, contacts, documents,
  onEdit, onArchive, onCreateLease,
  onContactsUpdated, onDocumentsUpdated, onTenantUpdated
}: Props) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const photoRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    (tenant as any).photo_url ?? null
  )

  const fullName = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || 'Unknown'
  const initials = `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()
  const activeLease = leases.find((l) => l.status === 'active')

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo too large. Max 5MB.')
      return
    }
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${tenant.id}/avatar.${ext}`

      // Remove old file first to avoid conflicts
      await supabase.storage.from('tenant-avatars').remove([fileName])

      const { error: uploadErr } = await supabase.storage
        .from('tenant-avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const { data: urlData } = supabase.storage
        .from('tenant-avatars')
        .getPublicUrl(fileName)

      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setPhotoUrl(url)

      const { data: updated, error: updateErr } = await supabase
        .from('tenants')
        .update({ photo_url: url } as any)
        .eq('id', tenant.id)
        .select()
        .single() as { data: Tenant | null; error: any }

      if (updateErr) throw new Error(updateErr.message)
      if (updated) onTenantUpdated(updated)
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  async function handlePhotoDelete() {
    setDeletingPhoto(true)
    setPhotoError('')
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'webp']
      await Promise.all(
        extensions.map((ext) =>
          supabase.storage
            .from('tenant-avatars')
            .remove([`${tenant.id}/avatar.${ext}`])
        )
      )
      const { data: updated, error: updateErr } = await supabase
        .from('tenants')
        .update({ photo_url: null } as any)
        .eq('id', tenant.id)
        .select()
        .single() as { data: Tenant | null; error: any }

      if (updateErr) throw new Error(updateErr.message)
      setPhotoUrl(null)
      if (updated) onTenantUpdated(updated)
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingPhoto(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <button
        onClick={() => router.push('/tenants')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tenants
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">

            {/* Avatar with upload + delete */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                    onError={() => setPhotoUrl(null)}
                  />
                ) : (
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700">
                    {initials || <User className="h-8 w-8" />}
                  </div>
                )}
              </div>

              {/* Upload button — bottom right */}
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto || deletingPhoto}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 border-2 border-white flex items-center justify-center transition-colors"
                title="Upload photo"
              >
                {uploadingPhoto
                  ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                  : <Camera className="h-3 w-3 text-white" />
                }
              </button>

              {/* Delete button — top right, only when photo exists */}
              {photoUrl && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={uploadingPhoto || deletingPhoto}
                  className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 border-2 border-white flex items-center justify-center transition-colors"
                  title="Remove photo"
                >
                  {deletingPhoto
                    ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                    : <span className="text-white text-xs font-bold leading-none">×</span>
                  }
                </button>
              )}

              <input
                ref={photoRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Name + status */}
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {fullName}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {tenant.occupation ?? 'No occupation listed'}
              </p>
              {photoError && (
                <p className="text-xs text-red-500 mt-1">{photoError}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  className={
                    tenant.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-100'
                  }
                >
                  {tenant.status}
                </Badge>
                {activeLease && (
                  <span className="text-xs text-slate-500">
                    Unit{' '}
                    <span className="font-medium text-slate-700">
                      {activeLease.units?.unit_code}
                    </span>
                    {' · '}
                    {activeLease.units?.buildings?.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={onCreateLease}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New lease
            </Button>
            {tenant.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onArchive}
                className="text-red-500 hover:text-red-600 hover:border-red-200"
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Contact info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow icon={Phone} label="Primary phone" value={tenant.primary_phone} />
            <InfoRow icon={Phone} label="Secondary phone" value={tenant.secondary_phone} />
            <InfoRow icon={Mail} label="Email" value={tenant.email} />
            <InfoRow icon={MapPin} label="Country" value={tenant.country} />
            {!tenant.primary_phone && !tenant.email && !tenant.country && (
              <p className="text-xs text-slate-400 py-2">No contact info added</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Personal info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow
              icon={Calendar}
              label="Date of birth"
              value={
                tenant.date_of_birth
                  ? format(new Date(tenant.date_of_birth), 'dd MMM yyyy')
                  : null
              }
            />
            <InfoRow icon={User} label="Marital status" value={tenant.marital_status} />
            <InfoRow icon={Briefcase} label="Employer" value={tenant.employer_name} />
            <InfoRow icon={Briefcase} label="Employment type" value={tenant.employment_type} />
            <InfoRow icon={MapPin} label="Work address" value={tenant.work_address} />
            {!tenant.date_of_birth && !tenant.marital_status && !tenant.employer_name && (
              <p className="text-xs text-slate-400 py-2">No personal info added</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Internal notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.notes ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {tenant.notes}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No internal notes. Edit tenant to add notes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents + Emergency contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocumentsCard
          tenantId={tenant.id}
          documents={documents}
          onUpdated={onDocumentsUpdated}
        />
        <EmergencyContactsCard
          tenantId={tenant.id}
          contacts={contacts}
          onUpdated={onContactsUpdated}
        />
      </div>

      {/* Lease history */}
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Lease history
            </CardTitle>
            <Button
              size="sm"
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={onCreateLease}
            >
              <Plus className="h-3 w-3 mr-1" />
              New lease
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No leases found for this tenant</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs"
                onClick={onCreateLease}
              >
                Create first lease
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">Building</TableHead>
                  <TableHead className="text-xs">Start</TableHead>
                  <TableHead className="text-xs">End</TableHead>
                  <TableHead className="text-xs">Rent / month</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {lease.units?.unit_code ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {lease.units?.buildings?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {lease.lease_end
                        ? format(new Date(lease.lease_end), 'dd MMM yyyy')
                        : <span className="text-emerald-600 text-xs font-medium">Active</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-medium">
                      {Number(lease.rent_amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${leaseStatusColor[lease.status]}`}>
                        {lease.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}