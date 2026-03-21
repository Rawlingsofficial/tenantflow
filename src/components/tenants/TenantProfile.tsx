'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase,
  Calendar, User, Archive, Plus, Pencil,
  AlertCircle, FileText, Camera, Loader2,
  Home, DollarSign, Clock, CheckCircle2,
  XCircle, TrendingUp, Shield, Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format, differenceInMonths, differenceInDays } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant, LeaseWithDetails, TenantEmergencyContact, TenantDocument } from '@/types'
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
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
  const [photoError, setPhotoError] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>((tenant as any).photo_url ?? null)

  const fullName = `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || 'Unknown'
  const initials = `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()
  const activeLease = leases.find((l) => l.status === 'active')

  // Compute tenancy duration
  const tenancyMonths = activeLease
    ? differenceInMonths(new Date(), new Date(activeLease.lease_start))
    : null

  // Lease end status
  const now = new Date()
  const leaseEnd = activeLease?.lease_end ? new Date(activeLease.lease_end) : null
  const daysUntilEnd = leaseEnd ? differenceInDays(leaseEnd, now) : null
  const isOverdue = leaseEnd && leaseEnd < now
  const isDueSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30

  // Total paid
  const totalPaid = leases.reduce((sum, l) => {
    return sum + ((l as any).rent_payments?.filter((p: any) => p.status === 'completed')
      ?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0)
  }, 0)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo too large. Max 5MB.'); return }
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${tenant.id}/avatar.${ext}`
      await supabase.storage.from('tenant-avatars').remove([fileName])
      const { error: uploadErr } = await supabase.storage
        .from('tenant-avatars').upload(fileName, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: urlData } = supabase.storage.from('tenant-avatars').getPublicUrl(fileName)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setPhotoUrl(url)
      const { data: updated } = await (supabase as any)
        .from('tenants').update({ photo_url: url }).eq('id', tenant.id).select().single()
      if (updated) onTenantUpdated(updated as Tenant)
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-12">
      {/* Back */}
      <div className="px-6 pt-5 pb-4">
        <button onClick={() => router.push('/tenants')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to tenants
        </button>
      </div>

      {/* Hero Card */}
      <div className="px-6 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Green top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm">
                    {photoUrl ? (
                      <img src={photoUrl} alt={fullName} className="w-full h-full object-cover"
                        onError={() => setPhotoUrl(null)} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white">
                        {initials || <User className="h-8 w-8" />}
                      </div>
                    )}
                  </div>
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 border-2 border-white flex items-center justify-center shadow-sm transition-colors">
                    {uploadingPhoto
                      ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                      : <Camera className="h-3 w-3 text-white" />}
                  </button>
                  <input ref={photoRef} type="file" className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoUpload} />
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      tenant.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {tenant.occupation ?? 'No occupation listed'}
                    {tenant.employer_name && ` · ${tenant.employer_name}`}
                  </p>
                  {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}

                  {/* Quick info pills */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {tenant.primary_phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <Phone className="h-3 w-3" /> {tenant.primary_phone}
                      </span>
                    )}
                    {tenant.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <Mail className="h-3 w-3" /> {tenant.email}
                      </span>
                    )}
                    {tenant.country && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <MapPin className="h-3 w-3" /> {tenant.country}
                      </span>
                    )}
                    {activeLease && (
                      <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <Home className="h-3 w-3" />
                        {(activeLease as any).units?.unit_code} · {(activeLease as any).units?.buildings?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit} className="h-8 text-xs rounded-lg gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" onClick={onCreateLease}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> New Lease
                </Button>
                {tenant.status === 'active' && (
                  <Button variant="outline" size="sm" onClick={onArchive}
                    className="h-8 text-xs rounded-lg gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-50">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Monthly Rent</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">
                  {activeLease ? `$${Number(activeLease.rent_amount).toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Tenancy</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">
                  {tenancyMonths !== null ? `${tenancyMonths}mo` : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {totalPaid > 0 ? `$${totalPaid.toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Lease Status</p>
                <p className={`text-sm font-bold mt-0.5 ${
                  isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : activeLease ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  {isOverdue ? 'Overdue' : isDueSoon ? `${daysUntilEnd}d left` : activeLease ? 'Active' : 'No lease'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active lease banner */}
      {activeLease && (
        <div className="px-6 mb-5">
          <div className={`rounded-xl border p-4 flex items-center justify-between ${
            isOverdue ? 'bg-red-50 border-red-200' :
            isDueSoon ? 'bg-amber-50 border-amber-200' :
            'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isOverdue ? 'bg-red-100' : isDueSoon ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <Key className={`h-4 w-4 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isOverdue ? 'Lease Overdue' : isDueSoon ? `Lease expires in ${daysUntilEnd} days` : 'Active Lease'}
                </p>
                <p className={`text-xs ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {(activeLease as any).units?.unit_code} · {(activeLease as any).units?.buildings?.name} ·{' '}
                  ${Number(activeLease.rent_amount).toLocaleString()}/mo ·{' '}
                  Started {format(new Date(activeLease.lease_start), 'MMM d, yyyy')}
                  {activeLease.lease_end && ` · Ends ${format(new Date(activeLease.lease_end), 'MMM d, yyyy')}`}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={onCreateLease} variant="outline"
              className={`h-7 text-xs rounded-lg ${
                isOverdue ? 'border-red-200 text-red-700 hover:bg-red-100' :
                isDueSoon ? 'border-amber-200 text-amber-700 hover:bg-amber-100' :
                'border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}>
              Renew Lease
            </Button>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-4">
        {/* Contact */}
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow icon={Phone} label="Primary Phone" value={tenant.primary_phone} />
            <InfoRow icon={Phone} label="Secondary Phone" value={tenant.secondary_phone} />
            <InfoRow icon={Mail} label="Email" value={tenant.email} />
            <InfoRow icon={MapPin} label="Country" value={tenant.country} />
            {!tenant.primary_phone && !tenant.email && !tenant.country && (
              <p className="text-xs text-gray-400 py-2">No contact info added</p>
            )}
          </CardContent>
        </Card>

        {/* Personal */}
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow icon={Calendar} label="Date of Birth"
              value={tenant.date_of_birth ? format(new Date(tenant.date_of_birth), 'dd MMM yyyy') : null} />
            <InfoRow icon={User} label="Marital Status" value={tenant.marital_status} />
            <InfoRow icon={Briefcase} label="Occupation" value={tenant.occupation} />
            <InfoRow icon={Briefcase} label="Employment Type" value={tenant.employment_type} />
            <InfoRow icon={Briefcase} label="Employer" value={tenant.employer_name} />
            <InfoRow icon={MapPin} label="Work Address" value={tenant.work_address} />
            {!tenant.date_of_birth && !tenant.marital_status && !tenant.employer_name && (
              <p className="text-xs text-gray-400 py-2">No personal info added</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Internal Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {tenant.notes ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{tenant.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No internal notes. Edit tenant to add notes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents + Emergency contacts */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-4">
        <DocumentsCard tenantId={tenant.id} documents={documents} onUpdated={onDocumentsUpdated} />
        <EmergencyContactsCard tenantId={tenant.id} contacts={contacts} onUpdated={onContactsUpdated} />
      </div>

      {/* Lease history */}
      <div className="px-6">
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Lease History
              </CardTitle>
              <Button size="sm" onClick={onCreateLease}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1">
                <Plus className="h-3 w-3" /> New Lease
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {leases.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No leases found for this tenant</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs rounded-lg" onClick={onCreateLease}>
                  Create first lease
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-5">Unit</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Building</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Start</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">End</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rent/mo</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((lease) => (
                    <TableRow key={lease.id} className="border-gray-50">
                      <TableCell className="text-sm font-semibold text-gray-900 pl-5">
                        {(lease as any).units?.unit_code ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(lease as any).units?.buildings?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(lease.lease_start), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {lease.lease_end
                          ? format(new Date(lease.lease_end), 'dd MMM yyyy')
                          : <span className="text-emerald-600 text-xs font-medium">Open-ended</span>}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-gray-800">
                        ${Number(lease.rent_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${leaseStatusColor[lease.status]}`}>
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
    </div>
  )
}
