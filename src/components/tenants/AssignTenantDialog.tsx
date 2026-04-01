'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Loader2, Search, User, FileText, X, Key, 
  Building2, MapPin, Home, CheckCircle2, 
  Shield, AlertCircle, ArrowRight, DollarSign,
  Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSupabaseWithAuth } from '@/lib/supabase/client'
import { usePropertyType } from '@/hooks/usePropertyType'
import type { Tenant, Unit } from '@/types'
import { cn } from '@/lib/utils'

interface VacantUnit extends Unit {
  buildings?: {
    id: string
    name: string
    address?: string | null
    organization_id?: string
    building_type?: string | null
  } | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  unit: Unit | null
  organizationId: string
  preselectedTenantId?: string
}

type Tab = 'existing' | 'new'

export default function AssignTenantDialog({ open, onClose, onSaved, unit, organizationId, preselectedTenantId }: Props) {
  const supabase = useSupabaseWithAuth()
  const { isResidential } = usePropertyType()
  const [tab, setTab] = useState<Tab>('existing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [availableUnits, setAvailableUnits] = useState<VacantUnit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<string>('all')
  const [loadingUnits, setLoadingUnits] = useState(false)

  const [tenantForm, setTenantFormState] = useState({
    tenant_type: isResidential ? 'individual' : 'company',
    first_name: '',
    last_name: '',
    company_name: '',
    contact_person: '',
    primary_phone: '',
    email: '',
    occupation: '',
    country: '',
    id_type: 'National ID',
    id_number: '',
    id_issuing_country: '',
    id_expiry_date: '',
  })
  
  const [leaseForm, setLeaseFormState] = useState({
    rent_amount: '',
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: '',
    renewal_date: '',
  })

  const loadExistingTenants = useCallback(async () => {
    if (!organizationId) return
    const { data } = await (supabase as any).from('tenants').select('*').eq('organization_id', organizationId).eq('status', 'active').order('first_name')
    setExistingTenants((data as Tenant[]) ?? [])
  }, [organizationId, supabase])

  const loadVacantUnits = useCallback(async () => {
    if (!organizationId) return
    setLoadingUnits(true)
    try {
      const { data: buildingRows } = await (supabase as any).from('buildings').select('id, name, address, building_type').eq('organization_id', organizationId)
      const buildingIds = (buildingRows ?? []).map((b: any) => b.id)
      if (buildingIds.length === 0) { setAvailableUnits([]); return }
      const { data: unitRows } = await (supabase as any).from('units').select('id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id').eq('status', 'vacant').in('building_id', buildingIds).order('unit_code')
      const buildingMap = Object.fromEntries((buildingRows ?? []).map((b: any) => [b.id, b]))
      setAvailableUnits((unitRows ?? []).map((u: any) => ({ ...u, buildings: buildingMap[u.building_id] ?? null })))
    } finally { setLoadingUnits(false) }
  }, [organizationId, supabase])

  useEffect(() => {
    if (!open) return
    setError(''); setSearch(''); setBuildingFilter('all'); setSelectedUnitId('')
    setTenantFormState({
      tenant_type: isResidential ? 'individual' : 'company',
      first_name: '', last_name: '', company_name: '', contact_person: '', primary_phone: '', email: '', occupation: '', country: '',
      id_type: 'National ID', id_number: '', id_issuing_country: '', id_expiry_date: '',
    })
    setLeaseFormState({ rent_amount: unit?.default_rent?.toString() ?? '', lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })
    
    if (preselectedTenantId) { setSelectedTenantId(preselectedTenantId); setTab('existing') }
    else { setSelectedTenantId(''); setTab('existing') }
    
    loadExistingTenants()
    if (!unit) loadVacantUnits()
  }, [open, isResidential, unit, preselectedTenantId, loadExistingTenants, loadVacantUnits])

  function setTenant(field: string, value: string) { setTenantFormState(p => ({ ...p, [field]: value })) }
  function setLease(field: string, value: string) { setLeaseFormState(p => ({ ...p, [field]: value })) }

  const uniqueBuildings = Array.from(new Map(availableUnits.filter(u => u.buildings).map(u => [u.buildings!.id, u.buildings!])).values())
  const filteredUnits = buildingFilter === 'all' ? availableUnits : availableUnits.filter(u => u.buildings?.id === buildingFilter)
  const selectedUnit = availableUnits.find(u => u.id === selectedUnitId)

  async function handleSave() {
    const unitId = unit?.id ?? selectedUnitId
    if (!unitId) { setError('Please select a unit'); return }
    if (!leaseForm.rent_amount) { setError('Rent amount is required'); return }
    if (!leaseForm.lease_start) { setError('Lease start date is required'); return }
    if (tab === 'existing' && !selectedTenantId) { setError('Please select a tenant'); return }
    
    const isCompany = tenantForm.tenant_type === 'company'

    if (tab === 'new') {
      if (isCompany) {
        if (!tenantForm.company_name.trim()) { setError('Company Name is required.'); return }
        if (!tenantForm.contact_person.trim()) { setError('Contact Person is required.'); return }
        if (!tenantForm.primary_phone.trim()) { setError('Primary Phone is required.'); return }
      } else {
        if (!tenantForm.first_name.trim()) { setError('First Name is required.'); return }
        if (!tenantForm.last_name.trim()) { setError('Last Name is required.'); return }
        if (!tenantForm.primary_phone.trim()) { setError('Phone Number is required.'); return }
        if (isResidential && !tenantForm.id_number.trim()) { setError('ID Card Number is required for residential tenants.'); return }
      }
    }

    setLoading(true); setError('')
    try {
      let tenantId = selectedTenantId
      if (tab === 'new') {
        const payload: any = {
          organization_id: organizationId,
          tenant_type: tenantForm.tenant_type,
          status: 'active',
          primary_phone: tenantForm.primary_phone.trim() || null,
          email: tenantForm.email.trim() || null,
          occupation: tenantForm.occupation.trim() || null,
          country: tenantForm.country.trim() || null,
        }

        if (isCompany) {
          payload.company_name = tenantForm.company_name.trim()
          payload.contact_person = tenantForm.contact_person.trim()
        } else {
          payload.first_name = tenantForm.first_name.trim()
          payload.last_name = tenantForm.last_name.trim()
        }

        const { data: newTenant, error: tErr } = await (supabase as any).from('tenants').insert(payload).select().single()
        
        if (tErr) throw tErr
        tenantId = (newTenant as Tenant).id

        if (tenantForm.id_number.trim()) {
          await (supabase as any).from('tenant_identifications').insert({
            tenant_id: tenantId,
            id_type: tenantForm.id_type,
            id_number: tenantForm.id_number.trim(),
            issuing_country: tenantForm.id_issuing_country.trim() || null,
            expiry_date: tenantForm.id_expiry_date || null
          })
        }
      }

      const { error: lErr } = await (supabase as any).from('leases').insert({
        organization_id: organizationId, tenant_id: tenantId, unit_id: unitId,
        rent_amount: parseFloat(leaseForm.rent_amount), lease_start: leaseForm.lease_start,
        lease_end: leaseForm.lease_end || null, renewal_date: leaseForm.renewal_date || null, status: 'active',
      })
      
      if (lErr) throw lErr
      
      await (supabase as any).from('units').update({ status: 'occupied' }).eq('id', unitId)
      onSaved(); onClose()
    } catch (err: any) {
      console.error(err)
      if (err.message?.includes('No suitable key') || err.message?.includes('JWT')) {
        setError('Authentication error: Please ensure your Clerk "supabase" JWT template uses the HS256 algorithm and the correct Supabase JWT Secret.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally { setLoading(false) }
  }

  const filteredTenants = existingTenants.filter(t => {
    const q = search.toLowerCase()
    return !q || `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.primary_phone?.includes(q) || t.company_name?.toLowerCase().includes(q)
  })

  const dialogTitle = unit ? `Assign Tenant — Unit ${unit.unit_code}` : preselectedTenantId ? 'Create New Lease' : 'Assign Tenant'
  const inputClass = "h-10 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block"
  const isCompany = tenantForm.tenant_type === 'company'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[24px] border-slate-200/80 shadow-2xl bg-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/30">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 shadow-lg shadow-teal-600/20 text-white">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">{dialogTitle}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {unit ? `Unit ${unit.unit_code} · Complete tenant assignment` : 'Select a unit and assign a tenant agreement'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">

          {/* Unit selector */}
          {!unit && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-bold text-slate-900">Target Property Unit</p>
                {availableUnits.length > 0 && (
                  <span className="ml-auto text-[10px] text-teal-600 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    {availableUnits.length} vacant
                  </span>
                )}
              </div>

              {uniqueBuildings.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setBuildingFilter('all'); setSelectedUnitId('') }}
                    className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border", 
                      buildingFilter === 'all' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    )}>
                    All <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", buildingFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{availableUnits.length}</span>
                  </button>
                  {uniqueBuildings.map(b => {
                    const count = availableUnits.filter(u => u.buildings?.id === b.id).length
                    return (
                      <button key={b.id} onClick={() => { setBuildingFilter(b.id); setSelectedUnitId('') }}
                        className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border",
                          buildingFilter === b.id ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                        )}>
                        <Building2 className="h-3 w-3" />{b.name}
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", buildingFilter === b.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {loadingUnits ? (
                <div className="text-center py-6 text-sm text-slate-500 flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  Refreshing units...
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Home className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-600">No inventory available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 pb-2">
                  {filteredUnits.map(u => {
                    const isSelected = selectedUnitId === u.id
                    return (
                      <button key={u.id} onClick={() => { setSelectedUnitId(u.id); if (u.default_rent) setLease('rent_amount', u.default_rent.toString()) }}
                        className={cn("text-left p-4 rounded-2xl border transition-all",
                          isSelected ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
                        )}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-base font-bold text-slate-900 font-mono">{u.unit_code}</p>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />}
                        </div>
                        {uniqueBuildings.length > 1 && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2"><Building2 className="h-3.5 w-3.5" />{u.buildings?.name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/80">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{u.unit_type ?? 'Unit'}</span>
                          {u.default_rent && <span className="text-sm font-bold text-teal-700">${Number(u.default_rent).toLocaleString()}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tenant selector */}
          {!preselectedTenantId && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-teal-600" />
                <p className="text-sm font-bold text-slate-900">Lease Recipient</p>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60">
                {(['existing', 'new'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all",
                      tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}>
                    {t === 'existing' ? 'Existing Profile' : 'New Prospect'}
                  </button>
                ))}
              </div>

              {tab === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search directory..." value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-10 h-11 text-sm rounded-xl border-slate-200 bg-slate-50 focus:bg-white" />
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredTenants.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 font-medium italic">No matches found in directory</div>
                    ) : filteredTenants.map(tenant => {
                      const tName = tenant.tenant_type === 'company' ? tenant.company_name : `${tenant.first_name} ${tenant.last_name}`
                      const tInitials = tenant.tenant_type === 'company' ? tName?.[0] : `${tenant.first_name?.[0] ?? ''}${tenant.last_name?.[0] ?? ''}`
                      return (
                        <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)}
                          className={cn("w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors border-b border-slate-100 last:border-0",
                            selectedTenantId === tenant.id ? 'bg-teal-50' : 'hover:bg-slate-50'
                          )}>
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                            selectedTenantId === tenant.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                          )}>
                            {tInitials?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900">{tName}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{tenant.primary_phone || tenant.email || 'No contact details'}</p>
                          </div>
                          {selectedTenantId === tenant.id && <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {tab === 'new' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {!isResidential && (
                    <div className="flex gap-2 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60">
                      <button
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", !isCompany ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        onClick={() => setTenant('tenant_type', 'individual')}
                      >
                        Individual
                      </button>
                      <button
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", isCompany ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        onClick={() => setTenant('tenant_type', 'company')}
                      >
                        Company
                      </button>
                    </div>
                  )}

                  {isCompany ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <Label className={labelClass}>Company Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="e.g. Acme Corporation" value={tenantForm.company_name} onChange={e => setTenant('company_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Contact Person <span className="text-rose-500">*</span></Label>
                        <Input placeholder="Full name" value={tenantForm.contact_person} onChange={e => setTenant('contact_person', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Primary Phone <span className="text-rose-500">*</span></Label>
                        <Input placeholder="+1 (555) 000-0000" value={tenantForm.primary_phone} onChange={e => setTenant('primary_phone', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <Label className={labelClass}>First Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="John" value={tenantForm.first_name} onChange={e => setTenant('first_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Last Name <span className="text-rose-500">*</span></Label>
                        <Input placeholder="Doe" value={tenantForm.last_name} onChange={e => setTenant('last_name', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <Label className={labelClass}>Primary Phone <span className="text-rose-500">*</span></Label>
                        <Input placeholder="+1 (555) 000-0000" value={tenantForm.primary_phone} onChange={e => setTenant('primary_phone', e.target.value)} className={inputClass} />
                      </div>
                      
                      <div className="sm:col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="h-4 w-4 text-teal-600" />
                          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Prospect Identity</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className={labelClass}>ID Type</Label>
                            <Select value={tenantForm.id_type} onValueChange={(v: string | null) => v && setTenant('id_type', v)}>
                              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
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
                            <Input placeholder="Document number" value={tenantForm.id_number} onChange={e => setTenant('id_number', e.target.value)} className={inputClass} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {preselectedTenantId && (
            <div className="bg-slate-900 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner font-black text-teal-400">
                  {existingTenants.find(t => t.id === preselectedTenantId)?.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-0.5">Pre-Selected Tenant</p>
                  <h4 className="text-lg font-bold leading-none truncate max-w-[240px]">
                    {(() => { const t = existingTenants.find(t => t.id === preselectedTenantId); return t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Active Tenant' })()}
                  </h4>
                </div>
              </div>
            </div>
          )}

          {/* Lease details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-6 border-t border-slate-100">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <p className="text-sm font-bold text-slate-900">Contractual Financials</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label className={labelClass}>Rent Amount <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                  <Input type="number" min="0" placeholder="0.00" value={leaseForm.rent_amount}
                    onChange={e => setLease('rent_amount', e.target.value)}
                    className={cn(inputClass, "pl-8 font-black text-slate-900")} />
                </div>
              </div>
              <div>
                <Label className={labelClass}>Start Date <span className="text-rose-500">*</span></Label>
                <Input type="date" value={leaseForm.lease_start} onChange={e => setLease('lease_start', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {error && (
            <div className="px-5 py-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800">Processing Error</p>
                <p className="text-sm text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="h-11 px-6 text-sm rounded-xl text-slate-500 hover:text-slate-700 font-medium transition-all">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="h-11 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-8 font-bold shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Saving...</> : (preselectedTenantId ? 'Initialize Agreement' : 'Finalize Assignment')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
