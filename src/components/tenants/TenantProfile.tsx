'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase,
  Calendar, User, Archive, Plus, Pencil,
  AlertCircle, FileText, Camera, Loader2,
  Home, DollarSign, Clock, CheckCircle2, Key,
  TrendingUp, Shield, ArrowUpRight, Building2,
  CreditCard, Layers, ArrowRight, Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, differenceInMonths, differenceInDays } from 'date-fns'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import type { Tenant, LeaseWithDetails, TenantEmergencyContact, TenantDocument, TenantIdentification } from '@/types'
import { DocumentsCard, EmergencyContactsCard } from './DocumentsAndContacts'
import { cn } from '@/lib/utils'

interface Props {
  tenant: Tenant
  leases: LeaseWithDetails[]
  contacts: TenantEmergencyContact[]
  documents: TenantDocument[]
  identifications: TenantIdentification[]
  onEdit: () => void
  onArchive: () => void
  onCreateLease: () => void
  onContactsUpdated: (contacts: TenantEmergencyContact[]) => void
  onDocumentsUpdated: (docs: TenantDocument[]) => void
  onTenantUpdated: (tenant: Tenant) => void
}

const leaseStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ended:      { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  terminated: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
}

function ProfileStat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  )
}

function InfoBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  )
}

export default function TenantProfile({
  tenant, leases, contacts, documents, identifications,
  onEdit, onArchive, onCreateLease,
  onContactsUpdated, onDocumentsUpdated, onTenantUpdated
}: Props) {
  const router = useRouter()
  const supabase = useSupabaseWithAuth()
  const photoRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>((tenant as any).photo_url ?? null)

  const isCompany = tenant.tenant_type === 'company'
  const fullName = isCompany 
    ? (tenant.company_name || 'Unnamed Company')
    : `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || 'Unknown Tenant'
  
  const initials = isCompany 
    ? fullName[0] 
    : `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`.toUpperCase()

  const activeLease = leases.find((l) => l.status === 'active')
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
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('tenant-avatars').getPublicUrl(fileName)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setPhotoUrl(url)
      const { data: updated } = await (supabase as any).from('tenants').update({ photo_url: url }).eq('id', tenant.id).select().single()
      if (updated) onTenantUpdated(updated as Tenant)
    } catch (err: any) {
      setPhotoError(err.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  const primaryId = identifications?.[0]

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Navigation & Actions Bar */}
      <div className="px-6 py-6 flex items-center justify-between">
        <button 
          onClick={() => router.push('/tenants')}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-teal-200 group-hover:bg-teal-50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Directory
        </button>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onEdit} className="h-10 rounded-2xl border-slate-200 font-bold text-slate-600 px-5 hover:bg-white hover:border-teal-500 hover:text-teal-600 transition-all">
            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
          <Button onClick={onCreateLease} className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-6 shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all">
            <Plus className="h-4 w-4 mr-2" /> New Lease
          </Button>
          {tenant.status === 'active' && (
            <Button variant="ghost" onClick={onArchive} className="h-10 rounded-2xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold px-4 transition-all">
              <Archive className="h-4 w-4 mr-2" /> Archive
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card & Quick Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Identity Card */}
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden p-8 text-center relative">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
            
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-xl overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                    {initials || '?'}
                  </div>
                )}
              </div>
              <button 
                onClick={() => photoRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-teal-600 hover:scale-110 transition-transform active:scale-95"
              >
                {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
              <input ref={photoRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{fullName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                tenant.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
              )}>
                {tenant.status}
              </span>
              <span className="text-xs font-bold text-slate-400 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                {tenant.tenant_type}
              </span>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 gap-6 text-left">
              <InfoBlock icon={Mail} label="Email Address" value={tenant.email} />
              <InfoBlock icon={Phone} label="Primary Phone" value={tenant.primary_phone} />
              <InfoBlock icon={MapPin} label="Region / Country" value={tenant.country} />
              {isCompany ? (
                <InfoBlock icon={Briefcase} label="Industry" value={tenant.industry} />
              ) : (
                <InfoBlock icon={Briefcase} label="Occupation" value={tenant.occupation} />
              )}
            </div>
          </div>

          {/* Emergency Contacts Section */}
          <EmergencyContactsCard tenantId={tenant.id} contacts={contacts} onUpdated={onContactsUpdated} />
        </div>

        {/* Right Column: Dynamic Content & Leases */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ProfileStat label="Total Payments" value={`$${totalPaid.toLocaleString()}`} icon={CreditCard} color="bg-emerald-50 text-emerald-600" />
            <ProfileStat 
              label="Active Unit" 
              value={activeLease ? (activeLease as any).units?.unit_code : 'None'} 
              icon={Home} 
              color="bg-teal-50 text-teal-600" 
            />
            <ProfileStat 
              label="Documents" 
              value={documents.length} 
              icon={Layers} 
              color="bg-indigo-50 text-indigo-600" 
            />
          </div>

          {/* Active Lease Detail Card */}
          {activeLease ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1B3B6F] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20"
            >
              <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                      <Key className="h-7 w-7 text-[#14b8a6]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 mb-1">Active Lease Agreement</p>
                      <h3 className="text-2xl font-black tracking-tight">{(activeLease as any).units?.unit_code} • {(activeLease as any).units?.buildings?.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Monthly Rent</p>
                    <p className="text-3xl font-black text-teal-400">${Number(activeLease.rent_amount).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Lease Start</p>
                    <p className="text-sm font-bold">{format(new Date(activeLease.lease_start), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Lease End</p>
                    <p className="text-sm font-bold">
                      {activeLease.lease_end ? format(new Date(activeLease.lease_end), 'MMM dd, yyyy') : 'Open Ended'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Payment Terms</p>
                    <p className="text-sm font-bold">{activeLease.payment_terms || 30} Days Net</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Service Charge</p>
                    <p className="text-sm font-bold">${Number(activeLease.service_charge || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-[32px] border border-dashed border-slate-300 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No active lease found</h3>
              <p className="text-slate-500 mb-6">This tenant is currently not assigned to any property.</p>
              <Button onClick={onCreateLease} className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl px-8 h-11 transition-all shadow-lg shadow-teal-600/20">
                Create Lease Now
              </Button>
            </div>
          )}

          {/* Secondary Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Background & Identification */}
            <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" /> Documentation
                </h3>
              </div>
              <div className="p-6 space-y-6 flex-1">
                {primaryId ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{primaryId.id_type}</p>
                      <p className="text-lg font-black text-slate-900">{primaryId.id_number}</p>
                      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-200/60">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Issuing Country</p>
                          <p className="text-xs font-bold text-slate-700">{primaryId.issuing_country || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Expiry Date</p>
                          <p className="text-xs font-bold text-slate-700">
                            {primaryId.expiry_date ? format(new Date(primaryId.expiry_date), 'MMM dd, yyyy') : 'No expiry'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No identification documents linked.</p>
                )}
                
                <div className="h-px bg-slate-50" />
                
                {!isCompany && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Marital Status</p>
                      <p className="text-sm font-bold text-slate-700 capitalize">{tenant.marital_status || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date of Birth</p>
                      <p className="text-sm font-bold text-slate-700">
                        {tenant.date_of_birth ? format(new Date(tenant.date_of_birth), 'MMM dd, yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Card (File Storage) */}
            <DocumentsCard tenantId={tenant.id} documents={documents} onUpdated={onDocumentsUpdated} />
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Internal Management Notes</h3>
            </div>
            <div className="p-6">
              {tenant.notes ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{tenant.notes}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No management notes have been recorded for this tenant yet.</p>
              )}
            </div>
          </div>

          {/* Full Lease History Table */}
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Complete Lease History
              </h3>
            </div>
            
            {leases.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">No historical records available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                      <th className="px-8 py-4">Unit</th>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Monthly Rent</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-8 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leases.map((l) => {
                      const cfg = leaseStatusConfig[l.status] || leaseStatusConfig.ended
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4">
                            <p className="text-sm font-black text-slate-900 font-mono">{(l as any).units?.unit_code || '—'}</p>
                            <p className="text-[11px] text-slate-400 font-bold uppercase">{(l as any).units?.buildings?.name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-600">
                            {format(new Date(l.lease_start), 'MMM yyyy')} — {l.lease_end ? format(new Date(l.lease_end), 'MMM yyyy') : 'Present'}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-slate-900">${Number(l.rent_amount).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", cfg.bg, cfg.text)}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                {l.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50"
                              onClick={() => router.push(`/leases/${l.id}`)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
