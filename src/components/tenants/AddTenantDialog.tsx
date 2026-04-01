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
import type { Tenant } from '@/types'
import { cn } from '@/lib/utils'

interface AddTenantDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tenant: Tenant) => void
  organizationId: string
  editTenant?: Tenant | null
}

const INDUSTRIES = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Retail',
  'Manufacturing', 'Legal', 'Education', 'Media & Marketing',
  'Logistics', 'Hospitality', 'Construction', 'Consulting', 'Other'
]

const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

export default function AddTenantDialog({ open, onClose, onSaved, organizationId, editTenant }: AddTenantDialogProps) {
  const supabase = useSupabaseWithAuth()
  const { isResidential } = usePropertyType()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('essential')

  const [form, setForm] = useState({
    tenant_type: editTenant?.tenant_type || (isResidential ? 'individual' : 'company'),
    first_name: editTenant?.first_name ?? '',
    last_name: editTenant?.last_name ?? '',
    company_name: editTenant?.company_name ?? '',
    contact_person: editTenant?.contact_person ?? '',
    primary_phone: editTenant?.primary_phone ?? '',
    email: editTenant?.email ?? '',
    
    // Identification
    id_type: 'National ID',
    id_number: '',
    id_issuing_country: '',
    id_expiry_date: '',
    
    // Additional info
    secondary_phone: editTenant?.secondary_phone ?? '',
    country: editTenant?.country ?? '',
    occupation: editTenant?.occupation ?? '',
    employment_type: editTenant?.employment_type ?? '',
    employer_name: editTenant?.employer_name ?? '',
    work_address: editTenant?.work_address ?? '',
    date_of_birth: editTenant?.date_of_birth ?? '',
    marital_status: editTenant?.marital_status ?? '',
    notes: editTenant?.notes ?? '',
    
    // Commercial specific
    company_reg_number: editTenant?.company_reg_number ?? '',
    vat_number: editTenant?.vat_number ?? '',
    industry: editTenant?.industry ?? '',
    company_size: editTenant?.company_size ?? '',
    contact_role: editTenant?.contact_role ?? '',
    
    // Emergency Contact
    ec_full_name: '',
    ec_phone: '',
    ec_relationship: '',
  })

  // Reset state when opened
  useEffect(() => {
    if (open && !editTenant) {
      setForm(prev => ({ ...prev, tenant_type: isResidential ? 'individual' : 'company' }))
      setActiveTab('essential')
      setError('')
    }
  }, [open, isResidential, editTenant])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    const isCompany = form.tenant_type === 'company'

    // Essential validation to start collecting rent
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

    setLoading(true)
    setError('')

    try {
      const payload: any = {
        organization_id: organizationId,
        tenant_type: form.tenant_type,
        status: 'active',
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

      let tenant: Tenant | null = null;

      if (editTenant) {
        const { data, error: err } = await (supabase as any)
          .from('tenants').update(payload).eq('id', editTenant.id).select().single()
        if (err) throw err
        tenant = data as Tenant;
      } else {
        const { data, error: err } = await (supabase as any)
          .from('tenants').insert(payload).select().single()
        if (err) throw err
        tenant = data as Tenant;

        // Insert identification if provided
        if (form.id_number.trim()) {
          const { error: idErr } = await (supabase as any).from('tenant_identifications').insert({
            tenant_id: tenant!.id,
            id_type: form.id_type,
            id_number: form.id_number.trim(),
            issuing_country: form.id_issuing_country.trim() || null,
            expiry_date: form.id_expiry_date || null
          } as any)
          if (idErr) console.warn('Failed to save identification:', idErr.message)
        }

        // Insert emergency contact if provided
        if (form.ec_full_name.trim()) {
          const { error: ecErr } = await (supabase as any).from('tenant_emergency_contacts').insert({
            tenant_id: tenant!.id,
            full_name: form.ec_full_name.trim(),
            phone: form.ec_phone.trim() || null,
            relationship: form.ec_relationship.trim() || null
          } as any)
          if (ecErr) console.warn('Failed to save emergency contact:', ecErr.message)
        }
      }
      
      onSaved(tenant!)
      onClose()
    } catch (err: any) {
      console.error(err)
      if (err.message?.includes('No suitable key') || err.message?.includes('JWT')) {
        setError('Authentication error: Please ensure your Clerk "supabase" JWT template uses the HS256 algorithm and the correct Supabase JWT Secret.')
      } else {
        setError(err.message || 'Failed to save tenant')
      }
    } finally {
      setLoading(false)
    }
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
                  {editTenant ? 'Edit Tenant Profile' : 'Add New Tenant'}
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the essential details needed to secure the lease and collect rent.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!editTenant && !isResidential && (
            <div className="flex gap-2 mt-6 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60">
              <button
                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", !isCompany ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                onClick={() => set('tenant_type', 'individual')}
              >
                Individual
              </button>
              <button
                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", isCompany ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                onClick={() => set('tenant_type', 'company')}
              >
                Company
              </button>
            </div>
          )}
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
                  <CheckCircle2 className="h-4 w-4 mr-2 opacity-50" /> Essential Information
                </TabsTrigger>
                <TabsTrigger 
                  value="additional" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold text-slate-500"
                >
                  <FileText className="h-4 w-4 mr-2 opacity-50" /> Additional Details (Optional)
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
                
                {/* Additional Personal/Company Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-400" /> Background Information
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
                    <MapPin className="h-4 w-4 text-slate-400" /> Address & Extended Contacts
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

                {!isCompany && (
                  <>
                    <div className="h-px bg-slate-100" />
                    {/* Emergency Contact */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" /> Emergency Contact
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Label className={labelClass}>Full Name</Label>
                          <Input placeholder="e.g. Jane Doe" value={form.ec_full_name} onChange={e => set('ec_full_name', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <Label className={labelClass}>Phone Number</Label>
                          <Input placeholder="+1 (555) 000-0000" value={form.ec_phone} onChange={e => set('ec_phone', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <Label className={labelClass}>Relationship</Label>
                          <Input placeholder="e.g. Spouse, Parent" value={form.ec_relationship} onChange={e => set('ec_relationship', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-slate-100" />

                {/* Notes */}
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
                <p className="text-sm font-bold text-rose-800">Error</p>
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
                Add More Details <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]"
            >
              {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Saving...</> : (editTenant ? 'Save Changes' : 'Create Tenant')}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
