'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, User, FileText, X, Key, Building2, MapPin, Home, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant, Unit } from '@/types'

interface VacantUnit extends Unit {
  buildings?: {
    id: string
    name: string
    address?: string | null
    organization_id?: string
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
  const supabase = getSupabaseBrowserClient()
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
    first_name: '', last_name: '', primary_phone: '', email: '', occupation: '', country: '',
  })
  const [leaseForm, setLeaseFormState] = useState({
    rent_amount: '',
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: '',
    renewal_date: '',
  })

  useEffect(() => {
    if (!open) return
    setError(''); setSearch(''); setBuildingFilter('all'); setSelectedUnitId('')
    setTenantFormState({ first_name: '', last_name: '', primary_phone: '', email: '', occupation: '', country: '' })
    setLeaseFormState({ rent_amount: unit?.default_rent?.toString() ?? '', lease_start: new Date().toISOString().split('T')[0], lease_end: '', renewal_date: '' })
    if (preselectedTenantId) { setSelectedTenantId(preselectedTenantId); setTab('existing') }
    else { setSelectedTenantId(''); setTab('existing') }
    loadExistingTenants()
    if (!unit) loadVacantUnits()
  }, [open])

  async function loadExistingTenants() {
    if (!organizationId) return
    const { data } = await supabase.from('tenants').select('*').eq('organization_id', organizationId).eq('status', 'active').order('first_name')
    setExistingTenants((data as Tenant[]) ?? [])
  }

  async function loadVacantUnits() {
    if (!organizationId) return
    setLoadingUnits(true)
    try {
      const { data: buildingRows } = await supabase.from('buildings').select('id, name, address').eq('organization_id', organizationId)
      const buildingIds = (buildingRows ?? []).map((b: any) => b.id)
      if (buildingIds.length === 0) { setAvailableUnits([]); return }
      const { data: unitRows } = await supabase.from('units').select('id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id').eq('status', 'vacant').in('building_id', buildingIds).order('unit_code')
      const buildingMap = Object.fromEntries((buildingRows ?? []).map((b: any) => [b.id, b]))
      setAvailableUnits((unitRows ?? []).map((u: any) => ({ ...u, buildings: buildingMap[u.building_id] ?? null })))
    } finally { setLoadingUnits(false) }
  }

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
    if (tab === 'new' && !tenantForm.first_name.trim()) { setError('First name is required'); return }
    setLoading(true); setError('')
    try {
      let tenantId = selectedTenantId
      if (tab === 'new') {
        const { data: newTenant, error: tErr } = await supabase.from('tenants').insert({
          organization_id: organizationId, first_name: tenantForm.first_name.trim(), last_name: tenantForm.last_name.trim() || null,
          primary_phone: tenantForm.primary_phone.trim() || null, email: tenantForm.email.trim() || null,
          occupation: tenantForm.occupation.trim() || null, country: tenantForm.country.trim() || null,
        } as any).select().single() as { data: Tenant | null; error: any }
        if (tErr || !newTenant) throw new Error(tErr?.message || 'Failed to create tenant')
        tenantId = newTenant.id
      }
      const { error: lErr } = await supabase.from('leases').insert({
        organization_id: organizationId, tenant_id: tenantId, unit_id: unitId,
        rent_amount: parseFloat(leaseForm.rent_amount), lease_start: leaseForm.lease_start,
        lease_end: leaseForm.lease_end || null, renewal_date: leaseForm.renewal_date || null, status: 'active',
      } as any)
      if (lErr) throw new Error(lErr.message)
      await (supabase as any).from('units').update({ status: 'occupied' }).eq('id', unitId)
      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const filteredTenants = existingTenants.filter(t => {
    const q = search.toLowerCase()
    return !q || `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.primary_phone?.includes(q)
  })

  const dialogTitle = unit ? `Assign Tenant — Unit ${unit.unit_code}` : preselectedTenantId ? 'Create New Lease' : 'Assign Tenant'
  const inputClass = "h-9 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <Key className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">{dialogTitle}</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {unit ? `Unit ${unit.unit_code} · fill in tenant and lease details` : 'Select a vacant unit and assign a tenant'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Unit selector */}
          {!unit && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Home className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Unit</p>
                {availableUnits.length > 0 && (
                  <span className="ml-auto text-[10px] text-teal-600 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    {availableUnits.length} vacant
                  </span>
                )}
              </div>

              {uniqueBuildings.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setBuildingFilter('all'); setSelectedUnitId('') }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      buildingFilter === 'all' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    }`}>
                    All <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${buildingFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{availableUnits.length}</span>
                  </button>
                  {uniqueBuildings.map(b => {
                    const count = availableUnits.filter(u => u.buildings?.id === b.id).length
                    return (
                      <button key={b.id} onClick={() => { setBuildingFilter(b.id); setSelectedUnitId('') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          buildingFilter === b.id ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                        }`}>
                        <Building2 className="h-3 w-3" />{b.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${buildingFilter === b.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {loadingUnits ? (
                <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  Loading units…
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
                  <Home className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">No vacant units</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredUnits.map(u => {
                    const isSelected = selectedUnitId === u.id
                    return (
                      <button key={u.id} onClick={() => { setSelectedUnitId(u.id); if (u.default_rent) setLease('rent_amount', u.default_rent.toString()) }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected ? 'border-teal-500 bg-teal-50/80 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-teal-200 hover:bg-white'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-slate-900 font-mono">{u.unit_code}</p>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />}
                        </div>
                        {uniqueBuildings.length > 1 && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-1"><Building2 className="h-2.5 w-2.5" />{u.buildings?.name}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 capitalize">{u.unit_type ?? 'Unit'}{u.bedrooms ? ` · ${u.bedrooms}bd` : ''}</span>
                          {u.default_rent && <span className="text-[10px] font-bold text-teal-600">${Number(u.default_rent).toLocaleString()}/mo</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedUnit && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-teal-800">Unit {selectedUnit.unit_code} selected</p>
                    <p className="text-xs text-teal-600">{selectedUnit.buildings?.name}{selectedUnit.buildings?.address ? ` · ${selectedUnit.buildings.address}` : ''}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Tenant selector */}
          {!preselectedTenantId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenant</p>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                {(['existing', 'new'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                      tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {t === 'existing' ? 'Existing Tenant' : 'New Tenant'}
                  </button>
                ))}
              </div>

              {tab === 'existing' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm rounded-xl border-slate-200" />
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    {filteredTenants.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-400">{existingTenants.length === 0 ? 'No tenants yet — use New Tenant tab' : 'No tenants match your search'}</p>
                      </div>
                    ) : filteredTenants.map(tenant => (
                      <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0 ${
                          selectedTenantId === tenant.id ? 'bg-teal-50' : 'hover:bg-slate-50'
                        }`}>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          selectedTenantId === tenant.id ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {(tenant.first_name?.[0] ?? '?').toUpperCase()}{(tenant.last_name?.[0] ?? '').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-xs text-slate-400 truncate">{tenant.occupation ? `${tenant.occupation} · ` : ''}{tenant.primary_phone ?? tenant.email ?? '—'}</p>
                        </div>
                        {selectedTenantId === tenant.id && <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'new' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'First name *', field: 'first_name', placeholder: 'John' },
                    { label: 'Last name', field: 'last_name', placeholder: 'Doe' },
                    { label: 'Phone', field: 'primary_phone', placeholder: '+237 6XX XXX XXX' },
                    { label: 'Email', field: 'email', placeholder: 'john@example.com' },
                    { label: 'Occupation', field: 'occupation', placeholder: 'e.g. Engineer' },
                    { label: 'Country', field: 'country', placeholder: 'e.g. Cameroon' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</Label>
                      <Input placeholder={placeholder} value={(tenantForm as any)[field]} onChange={e => setTenant(field, e.target.value)} className={inputClass} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {preselectedTenantId && (
            <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-xs font-bold text-[#14b8a6] shrink-0">
                {existingTenants.find(t => t.id === preselectedTenantId)?.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {(() => { const t = existingTenants.find(t => t.id === preselectedTenantId); return t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Loading…' })()}
                </p>
                <p className="text-xs text-teal-600 font-medium">Tenant selected</p>
              </div>
            </div>
          )}

          {/* Lease details */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lease Details</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Rent Amount *
                  {(() => {
                    const defaultRent = unit?.default_rent ?? selectedUnit?.default_rent
                    const entered = parseFloat(leaseForm.rent_amount)
                    if (!defaultRent || !leaseForm.rent_amount || isNaN(entered)) return null
                    const diff = entered - Number(defaultRent)
                    const pct = Math.round(Math.abs(diff) / Number(defaultRent) * 100)
                    if (diff === 0) return null
                    return (
                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case tracking-normal ${diff > 0 ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                        {diff > 0 ? `+${pct}%` : `-${pct}%`} default
                      </span>
                    )
                  })()}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                  <Input type="number" min="0" placeholder="0.00" value={leaseForm.rent_amount}
                    onChange={e => setLease('rent_amount', e.target.value)}
                    className={`h-9 text-sm rounded-xl pl-6 border-slate-200 focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400`} />
                </div>
                {(() => {
                  const defaultRent = unit?.default_rent ?? selectedUnit?.default_rent
                  if (!defaultRent) return null
                  return (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-400">Default: <span className="font-semibold text-slate-600">${Number(defaultRent).toLocaleString()}/mo</span></p>
                      {leaseForm.rent_amount !== String(defaultRent) && (
                        <button type="button" onClick={() => setLease('rent_amount', String(defaultRent))} className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold">Reset</button>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date *</Label>
                <Input type="date" value={leaseForm.lease_start} onChange={e => setLease('lease_start', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  End Date <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.lease_end} onChange={e => setLease('lease_end', e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Renewal Date <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.renewal_date} onChange={e => setLease('renewal_date', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-xl border-slate-200 text-slate-600 px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl px-6 font-semibold shadow-sm">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              : preselectedTenantId ? 'Create Lease' : 'Assign Tenant & Create Lease'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
