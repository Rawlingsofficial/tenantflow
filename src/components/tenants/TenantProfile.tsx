'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase,
  Calendar, User, Archive, Plus, Pencil,
  AlertCircle, FileText, Camera, Loader2,
  Home, DollarSign, Clock, CheckCircle2, Key,
  TrendingUp, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, differenceInMonths, differenceInDays } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant, LeaseWithDetails, TenantEmergencyContact, TenantDocument } from '@/types'
import { DocumentsCard, EmergencyContactsCard } from './DocumentsAndContacts'

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

const leaseStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  ended:      { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  terminated: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
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

  const tenancyMonths = activeLease ? differenceInMonths(new Date(), new Date(activeLease.lease_start)) : null
  const now = new Date()
  const leaseEnd = activeLease?.lease_end ? new Date(activeLease.lease_end) : null
  const daysUntilEnd = leaseEnd ? differenceInDays(leaseEnd, now) : null
  const isOverdue = leaseEnd && leaseEnd < now
  const isDueSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30

  const totalPaid = leases.reduce((sum, l) => {
    return sum + ((l as any).rent_payments?.filter((p: any) => p.status === 'completed')
      ?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0)
  }, 0)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo too large. Max 5MB.'); return }
    setUploadingPhoto(true); setPhotoError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${tenant.id}/avatar.${ext}`
      await supabase.storage.from('tenant-avatars').remove([fileName])
      const { error: uploadErr } = await supabase.storage.from('tenant-avatars').upload(fileName, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: urlData } = supabase.storage.from('tenant-avatars').getPublicUrl(fileName)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setPhotoUrl(url)
      const { data: updated } = await (supabase as any).from('tenants').update({ photo_url: url }).eq('id', tenant.id).select().single()
      if (updated) onTenantUpdated(updated as Tenant)
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-12">
      {/* Back */}
      <div className="px-6 pt-5 pb-4">
        <button onClick={() => router.push('/tenants')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to tenants
        </button>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 mb-5"
      >
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#1B3B6F] via-teal-500 to-teal-400" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    {photoUrl ? (
                      <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" onError={() => setPhotoUrl(null)} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-2xl font-bold text-[#14b8a6]">
                        {initials || <User className="h-8 w-8" />}
                      </div>
                    )}
                  </div>
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-700 border-2 border-white flex items-center justify-center shadow-sm transition-colors">
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Camera className="h-3 w-3 text-white" />}
                  </button>
                  <input ref={photoRef} type="file" className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoUpload} />
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                      tenant.status === 'active'
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'active' ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'}`} />
                      {tenant.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {tenant.occupation ?? 'No occupation listed'}
                    {tenant.employer_name && ` · ${tenant.employer_name}`}
                  </p>
                  {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}

                  {/* Quick pills */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {tenant.primary_phone && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        <Phone className="h-3 w-3" /> {tenant.primary_phone}
                      </span>
                    )}
                    {tenant.email && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        <Mail className="h-3 w-3" /> {tenant.email}
                      </span>
                    )}
                    {tenant.country && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                        <MapPin className="h-3 w-3" /> {tenant.country}
                      </span>
                    )}
                    {activeLease && (
                      <span className="flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                        <Home className="h-3 w-3" />
                        {(activeLease as any).units?.unit_code} · {(activeLease as any).units?.buildings?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit} className="h-8 text-xs rounded-xl border-slate-200 gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" onClick={onCreateLease}
                  className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> New Lease
                </Button>
                {tenant.status === 'active' && (
                  <Button variant="outline" size="sm" onClick={onArchive}
                    className="h-8 text-xs rounded-xl gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: 'Monthly Rent', value: activeLease ? `$${Number(activeLease.rent_amount).toLocaleString()}` : '—', color: 'text-slate-800' },
                { label: 'Tenancy', value: tenancyMonths !== null ? `${tenancyMonths}mo` : '—', color: 'text-slate-800' },
                { label: 'Total Paid', value: totalPaid > 0 ? `$${totalPaid.toLocaleString()}` : '—', color: 'text-teal-600' },
                {
                  label: 'Lease Status',
                  value: isOverdue ? 'Overdue' : isDueSoon ? `${daysUntilEnd}d left` : activeLease ? 'Active' : 'No lease',
                  color: isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : activeLease ? 'text-teal-600' : 'text-slate-400'
                },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-lg font-bold mt-0.5 tabular-nums ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active lease banner */}
      {activeLease && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="px-6 mb-5"
        >
          <div className={`rounded-2xl border p-4 flex items-center justify-between ${
            isOverdue ? 'bg-red-50 border-red-200' :
            isDueSoon ? 'bg-amber-50 border-amber-200' :
            'bg-teal-50 border-teal-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100' : isDueSoon ? 'bg-amber-100' : 'bg-teal-100'}`}>
                <Key className={`h-4 w-4 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-teal-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-teal-700'}`}>
                  {isOverdue ? 'Lease Overdue' : isDueSoon ? `Lease expires in ${daysUntilEnd} days` : 'Active Lease'}
                </p>
                <p className={`text-xs ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-teal-500'}`}>
                  {(activeLease as any).units?.unit_code} · {(activeLease as any).units?.buildings?.name} ·{' '}
                  ${Number(activeLease.rent_amount).toLocaleString()}/mo ·{' '}
                  Started {format(new Date(activeLease.lease_start), 'MMM d, yyyy')}
                  {activeLease.lease_end && ` · Ends ${format(new Date(activeLease.lease_end), 'MMM d, yyyy')}`}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={onCreateLease} variant="outline"
              className={`h-7 text-xs rounded-xl ${
                isOverdue ? 'border-red-200 text-red-700 hover:bg-red-100' :
                isDueSoon ? 'border-amber-200 text-amber-700 hover:bg-amber-100' :
                'border-teal-200 text-teal-700 hover:bg-teal-100'
              }`}>
              Renew Lease
            </Button>
          </div>
        </motion.div>
      )}

      {/* Info grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="px-6 grid grid-cols-3 gap-4 mb-4"
      >
        {/* Contact */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Info</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <InfoRow icon={Phone} label="Primary Phone" value={tenant.primary_phone} />
            <InfoRow icon={Phone} label="Secondary Phone" value={tenant.secondary_phone} />
            <InfoRow icon={Mail} label="Email" value={tenant.email} />
            <InfoRow icon={MapPin} label="Country" value={tenant.country} />
            {!tenant.primary_phone && !tenant.email && !tenant.country && (
              <p className="text-xs text-slate-400 py-2">No contact info added</p>
            )}
          </div>
        </div>

        {/* Personal */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personal Info</p>
          </div>
          <div className="px-4 pb-4 pt-2">
            <InfoRow icon={Calendar} label="Date of Birth" value={tenant.date_of_birth ? format(new Date(tenant.date_of_birth), 'dd MMM yyyy') : null} />
            <InfoRow icon={User} label="Marital Status" value={tenant.marital_status} />
            <InfoRow icon={Briefcase} label="Occupation" value={tenant.occupation} />
            <InfoRow icon={Briefcase} label="Employment Type" value={tenant.employment_type} />
            <InfoRow icon={Briefcase} label="Employer" value={tenant.employer_name} />
            <InfoRow icon={MapPin} label="Work Address" value={tenant.work_address} />
            {!tenant.date_of_birth && !tenant.marital_status && !tenant.employer_name && (
              <p className="text-xs text-slate-400 py-2">No personal info added</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Internal Notes</p>
          </div>
          <div className="px-4 pb-4 pt-3">
            {tenant.notes ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{tenant.notes}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">No internal notes. Edit tenant to add notes.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Documents + Emergency contacts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="px-6 grid grid-cols-2 gap-4 mb-4"
      >
        <DocumentsCard tenantId={tenant.id} documents={documents} onUpdated={onDocumentsUpdated} />
        <EmergencyContactsCard tenantId={tenant.id} contacts={contacts} onUpdated={onContactsUpdated} />
      </motion.div>

      {/* Lease history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="px-6"
      >
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lease History</p>
            </div>
            <Button size="sm" onClick={onCreateLease}
              className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1 shadow-sm">
              <Plus className="h-3 w-3" /> New Lease
            </Button>
          </div>

          {leases.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium text-slate-500">No leases found</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs rounded-xl border-slate-200" onClick={onCreateLease}>
                Create first lease
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Building</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">End</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rent/mo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease, i) => {
                  const cfg = leaseStatusConfig[lease.status] ?? leaseStatusConfig.ended
                  return (
                    <motion.tr
                      key={lease.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono font-semibold text-slate-800">{(lease as any).units?.unit_code ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{(lease as any).units?.buildings?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{format(new Date(lease.lease_start), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3">
                        {lease.lease_end
                          ? <span className="text-slate-500">{format(new Date(lease.lease_end), 'dd MMM yyyy')}</span>
                          : <span className="text-teal-600 font-medium text-[10px]">Open-ended</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 tabular-nums">${Number(lease.rent_amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {lease.status}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  )
}
