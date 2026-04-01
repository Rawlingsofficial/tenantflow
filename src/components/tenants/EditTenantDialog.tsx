'use client'

import { useState, useEffect } from 'react'
import { 
  Loader2, User, Building2, Phone, Mail, MapPin, 
  FileText, X, Shield, AlertCircle, Briefcase, 
  CheckCircle2, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { usePropertyType } from '@/hooks/usePropertyType'
import type { Tenant, TenantIdentification } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (tenant: Tenant) => void
  tenant: Tenant
  identification?: TenantIdentification | null
}

const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Retail',
  'Manufacturing', 'Legal', 'Education', 'Media & Marketing',
  'Logistics', 'Hospitality', 'Construction', 'Consulting', 'Other'
]

const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

export default function EditTenantDialog({ open, onClose, onSaved, tenant, identification }: Props) {
  const supabase = useSupabaseWithAuth()
  const { isResidential } = usePropertyType()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('essential')

  const [form, setForm] = useState({
    tenant_type: tenant.tenant_type || 'individual',
    first_name: tenant.first_name ?? '',
    last_name: tenant.last_name ?? '',
    company_name: tenant.company_name ?? '',
    contact_person: tenant.contact_person ?? '',
    primary_phone: tenant.primary_phone ?? '',
    email: tenant.email ?? '',
    
    // Identification
    id_type: identification?.id_type ?? 'National ID',
    id_number: identification?.id_number ?? '',
    id_issuing_country: identification?.issuing_country ?? '',
    id_expiry_date: identification?.expiry_date ?? '',
    
    // Additional info
    secondary_phone: tenant.secondary_phone ?? '',
    country: tenant.country ?? '',
    occupation: tenant.occupation ?? '',
    employment_type: tenant.employment_type ?? '',
    employer_name: tenant.employer_name ?? '',
    work_address: tenant.work_address ?? '',
    date_of_birth: tenant.date_of_birth ?? '',
    marital_status: tenant.marital_status ?? '',
    notes: tenant.notes ?? '',
    
    // Commercial specific
    company_reg_number: tenant.company_reg_number ?? '',
    vat_number: tenant.vat_number ?? '',
    industry: tenant.industry ?? '',
    company_size: tenant.company_size ?? '',
    contact_role: tenant.contact_role ?? '',
  })

  useEffect(() => {
    if (open && tenant) {
      setForm({
        tenant_type: tenant.tenant_type || 'individual',
        first_name: tenant.first_name ?? '',
        last_name: tenant.last_name ?? '',
        company_name: tenant.company_name ?? '',
        contact_person: tenant.contact_person ?? '',
        primary_phone: tenant.primary_phone ?? '',
        email: tenant.email ?? '',
        id_type: identification?.id_type ?? 'National ID',
        id_number: identification?.id_number ?? '',
        id_issuing_country: identification?.issuing_country ?? '',
        id_expiry_date: identification?.expiry_date ?? '',
        secondary_phone: tenant.secondary_phone ?? '',
        country: tenant.country ?? '',
        occupation: tenant.occupation ?? '',
        employment_type: tenant.employment_type ?? '',
        employer_name: tenant.employer_name ?? '',
        work_address: tenant.work_address ?? '',
        date_of_birth: tenant.date_of_birth ?? '',
        marital_status: tenant.marital_status ?? '',
        notes: tenant.notes ?? '',
        company_reg_number: tenant.company_reg_number ?? '',
        vat_number: tenant.vat_number ?? '',
        industry: tenant.industry ?? '',
        company_size: tenant.company_size ?? '',
        contact_role: tenant.contact_role ?? '',
      })
      setActiveTab('essential')
      setError('')
    }
  }, [open, tenant, identification])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    const isCompany = form.tenant_type === 'company'

    if (isCompany) {
      if (!form.company_name.trim()) { setError('Company Name is required.'); return }
      if (!form.contact_person.trim()) { setError('Contact Person is required.'); return }
      if (!form.primary_phone.trim()) { setError('Primary Phone is required.'); return }
    } else {
      if (!form.first_name.trim()) { setError('First Name is required.'); return }
      if (!form.last_name.trim()) { setError('Last Name is required.'); return }
      if (!form.primary_phone.trim()) { setError('Phone Number is required.'); return }
      if (isResidential && !form.id_number.trim()) { setError('ID Card Number is required for residential tenants.'); return }
    }

    setLoading(true); setError('')
    try {
      const payload: any = {
        tenant_type: form.tenant_type,
        primary_phone: form.primary_phone.trim() || null,
        secondary_phone: form.secondary_phone.trim() || null,
        email: form.email.trim() || null,
        country: form.country.trim() || null,
        work_address: form.work_address.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (isCompany) {
        payload.company_name = form.company_name.trim()
        payload.contact_person = form.contact_person.trim()
        payload.company_reg_number = form.company_reg_number.trim() || null
        payload.vat_number = form.vat_number.trim() || null
        payload.industry = form.industry || null
        payload.company_size = form.company_size || null
        payload.contact_role = form.contact_role.trim() || null
      } else {
        payload.first_name = form.first_name.trim()
        payload.last_name = form.last_name.trim()
        payload.occupation = form.occupation.trim() || null
        payload.employment_type = form.employment_type || null
        payload.employer_name = form.employer_name.trim() || null
        payload.date_of_birth = form.date_of_birth || null
        payload.marital_status = form.marital_status || null
      }

      const { data, error: err } = await (supabase as any).from('tenants').update(payload).eq('id', tenant.id).select().single()
      if (err) throw err

      // Identification Logic
      if (form.id_number.trim()) {
        const idPayload = {
          tenant_id: tenant.id,
          id_type: form.id_type,
          id_number: form.id_number.trim(),
          issuing_country: form.id_issuing_country.trim() || null,
          expiry_date: form.id_expiry_date || null
        }
        if (identification) {
          await (supabase as any).from('tenant_identifications').update(idPayload).eq('id', identification.id)
        } else {
          await (supabase as any).from('tenant_identifications').insert(idPayload as any)
        }
      }

      onSaved(data as Tenant); onClose()
    } catch (err: any) {
      console.error(err)
      if (err.message?.includes('No suitable key') || err.message?.includes('JWT')) {
        setError('Authentication error: Please ensure your Clerk "supabase" JWT template uses the HS256 algorithm and the correct Supabase JWT Secret.')
      } else {
        setError(err.message || 'Failed to save')
      }
    } finally { setLoading(false) }
  }

  const isCompany = form.tenant_type === 'company'
  const inputClass = "h-10 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-[24px] border-slate-200/80 shadow-2xl bg-white flex flex-col max-h-[90vh]">
        
        {/* Header Region */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/30">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/20 text-white">
                {isCompany ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  Edit Tenant Profile
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Manage core contact details and background information.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form Body with Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            
            <div className="px-8 pt-4 border-b border-slate-100">
              <TabsList className="flex gap-6 border-b-0 h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="essential" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold text-slate-500"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 opacity-50" /> Identity & Contact
                </TabsTrigger>
                <TabsTrigger 
                  value="additional" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold text-slate-500"
                >
                  <FileText className="h-4 w-4 mr-2 opacity-50" /> Extended Background
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              
              <TabsContent value="essential" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Section: Primary Identity */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" /> Primary Identity
                  </h3>
                  
                  {isCompany ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <Label className={labelClass}>Company Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="e.g. Acme Corporation" value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Contact Person <span className="text-rose-500">*</span></Label>
                        <Input placeholder="Full name of primary contact" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Contact Role</Label>
                        <Input placeholder="e.g. CEO, Operations Manager" value={form.contact_role} onChange={e => set('contact_role', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <Label className={labelClass}>First Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="e.g. John" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Last Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="e.g. Doe" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Section: Contact & ID */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-teal-600" /> Contact & Identification
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className={labelClass}>Primary Phone <span className="text-rose-500">*</span></Label>
                      <Input placeholder="+1 (555) 000-0000" value={form.primary_phone} onChange={e => set('primary_phone', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <Label className={labelClass}>Email Address</Label>
                      <Input type="email" placeholder="contact@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
                    </div>
                    
                    {!isCompany && (
                      <>
                        <div>
                          <Label className={labelClass}>ID Type</Label>
                          <Select value={form.id_type} onValueChange={(v: string | null) => v && set('id_type', v)}>
                            <SelectTrigger className={inputClass}><SelectValue placeholder="Select ID type..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="National ID">National ID</SelectItem>
                              <SelectItem value="Passport">Passport</SelectItem>
                              <SelectItem value="Driver License">Driver License</SelectItem>
                              <SelectItem value="Residence Permit">Residence Permit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className={labelClass}>
                            ID Number {isResidential && <span className="text-rose-500">*</span>}
                          </Label>
                          <Input placeholder="Document number" value={form.id_number} onChange={e => set('id_number', e.target.value)} className={inputClass} />
                        </div>
                      </>
                    )}

                    {isCompany && (
                      <>
                        <div>
                          <Label className={labelClass}>Registration Number</Label>
                          <Input placeholder="Company Reg No." value={form.company_reg_number} onChange={e => set('company_reg_number', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <Label className={labelClass}>VAT Number</Label>
                          <Input placeholder="VAT/Tax ID" value={form.vat_number} onChange={e => set('vat_number', e.target.value)} className={inputClass} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </TabsContent>

              <TabsContent value="additional" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Additional Background Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-400" /> Background & Employment
                  </h3>
                  
                  {isCompany ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <Label className={labelClass}>Industry</Label>
                        <Select value={form.industry} onValueChange={(v: string | null) => v && set('industry', v)}>
                          <SelectTrigger className={inputClass}><SelectValue placeholder="Select industry..." /></SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={labelClass}>Company Size</Label>
                        <Select value={form.company_size} onValueChange={(v: string | null) => v && set('company_size', v)}>
                          <SelectTrigger className={inputClass}><SelectValue placeholder="Select size..." /></SelectTrigger>
                          <SelectContent>
                            {SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <Label className={labelClass}>Occupation</Label>
                        <Input placeholder="e.g. Software Engineer" value={form.occupation} onChange={e => set('occupation', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Employer Name</Label>
                        <Input placeholder="e.g. Acme Corp" value={form.employer_name} onChange={e => set('employer_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Date of Birth</Label>
                        <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Marital Status</Label>
                        <Select value={form.marital_status} onValueChange={(v: string | null) => v && set('marital_status', v)}>
                          <SelectTrigger className={inputClass}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Extended Contact & Address */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Address Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className={labelClass}>Secondary Phone</Label>
                      <Input placeholder="Alternative number" value={form.secondary_phone} onChange={e => set('secondary_phone', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <Label className={labelClass}>Country / Region</Label>
                      <Input placeholder="e.g. Cameroon" value={form.country} onChange={e => set('country', e.target.value)} className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className={labelClass}>Full Address</Label>
                      <Input placeholder="Street, City, Postal Code" value={form.work_address} onChange={e => set('work_address', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Internal Notes */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" /> Internal Notes
                  </h3>
                  <textarea
                    className="w-full min-h-[120px] p-4 text-sm border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-800 placeholder-slate-400"
                    placeholder="Private notes about this tenant (not visible to tenant)..."
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </div>

              </TabsContent>
            </div>
          </Tabs>

          {error && (
            <div className="mx-8 mb-4 px-5 py-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800">Update Error</p>
                <p className="text-sm text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={loading}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl px-5 h-11 font-medium"
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            {activeTab === 'essential' && (
              <Button 
                variant="outline"
                onClick={() => setActiveTab('additional')} 
                className="h-11 rounded-xl px-6 border-slate-200 text-slate-600 font-semibold gap-2 hover:bg-slate-50"
              >
                Background Info <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all"
            >
              {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
