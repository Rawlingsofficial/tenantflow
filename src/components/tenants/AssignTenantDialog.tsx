'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, User, FileText, X, Key, Building2, MapPin, Home } from 'lucide-react'
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

export default function AssignTenantDialog({
  open, onClose, onSaved, unit, organizationId, preselectedTenantId
}: Props) {
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
    first_name: '', last_name: '', primary_phone: '',
    email: '', occupation: '', country: '',
  })

  const [leaseForm, setLeaseFormState] = useState({
    rent_amount: '',
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: '',
    renewal_date: '',
  })

  // Load everything when dialog opens
  useEffect(() => {
    if (!open) return
    setError('')
    setSearch('')
    setBuildingFilter('all')
    setSelectedUnitId('')
    setTenantFormState({ first_name: '', last_name: '', primary_phone: '', email: '', occupation: '', country: '' })
    setLeaseFormState({
      rent_amount: unit?.default_rent?.toString() ?? '',
      lease_start: new Date().toISOString().split('T')[0],
      lease_end: '',
      renewal_date: '',
    })

    if (preselectedTenantId) {
      setSelectedTenantId(preselectedTenantId)
      setTab('existing')
    } else {
      setSelectedTenantId('')
      setTab('existing')
    }

    // Always load both — units needed regardless of mode
    loadExistingTenants()
    if (!unit) loadVacantUnits()
  }, [open])

  async function loadExistingTenants() {
    if (!organizationId) return
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('first_name')
    setExistingTenants((data as Tenant[]) ?? [])
  }

  async function loadVacantUnits() {
    if (!organizationId) return
    setLoadingUnits(true)
    try {
      // Step 1: get building IDs for this org (no join filter — plain eq on own column)
      const { data: buildingRows, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address')
        .eq('organization_id', organizationId)

      if (bErr) { console.error('buildings error:', bErr); return }
      const buildingIds = (buildingRows ?? []).map((b: any) => b.id)
      if (buildingIds.length === 0) { setAvailableUnits([]); return }

      // Step 2: get vacant units in those buildings
      const { data: unitRows, error: uErr } = await supabase
        .from('units')
        .select('id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id')
        .eq('status', 'vacant')
        .in('building_id', buildingIds)
        .order('unit_code')

      if (uErr) { console.error('units error:', uErr); return }

      // Step 3: manually attach building info
      const buildingMap = Object.fromEntries(
        (buildingRows ?? []).map((b: any) => [b.id, b])
      )
      const enriched: VacantUnit[] = (unitRows ?? []).map((u: any) => ({
        ...u,
        buildings: buildingMap[u.building_id] ?? null,
      }))

      setAvailableUnits(enriched)
    } finally {
      setLoadingUnits(false)
    }
  }

  function setTenant(field: string, value: string) {
    setTenantFormState(p => ({ ...p, [field]: value }))
  }
  function setLease(field: string, value: string) {
    setLeaseFormState(p => ({ ...p, [field]: value }))
  }

  // Unique buildings from available units — for the filter
  const uniqueBuildings = Array.from(
    new Map(
      availableUnits
        .filter(u => u.buildings)
        .map(u => [u.buildings!.id, u.buildings!])
    ).values()
  )

  // Filter units by selected building
  const filteredUnits = buildingFilter === 'all'
    ? availableUnits
    : availableUnits.filter(u => u.buildings?.id === buildingFilter)

  const selectedUnit = availableUnits.find(u => u.id === selectedUnitId)

  async function handleSave() {
    const unitId = unit?.id ?? selectedUnitId
    if (!unitId) { setError('Please select a unit'); return }
    if (!leaseForm.rent_amount) { setError('Rent amount is required'); return }
    if (!leaseForm.lease_start) { setError('Lease start date is required'); return }
    if (tab === 'existing' && !selectedTenantId) { setError('Please select a tenant'); return }
    if (tab === 'new' && !tenantForm.first_name.trim()) { setError('First name is required'); return }

    setLoading(true)
    setError('')
    try {
      let tenantId = selectedTenantId

      if (tab === 'new') {
        const { data: newTenant, error: tErr } = await supabase
          .from('tenants')
          .insert({
            organization_id: organizationId,
            first_name: tenantForm.first_name.trim(),
            last_name: tenantForm.last_name.trim() || null,
            primary_phone: tenantForm.primary_phone.trim() || null,
            email: tenantForm.email.trim() || null,
            occupation: tenantForm.occupation.trim() || null,
            country: tenantForm.country.trim() || null,
          } as any)
          .select()
          .single() as { data: Tenant | null; error: any }
        if (tErr || !newTenant) throw new Error(tErr?.message || 'Failed to create tenant')
        tenantId = newTenant.id
      }

      const { error: lErr } = await supabase
        .from('leases')
        .insert({
          organization_id: organizationId,
          tenant_id: tenantId,
          unit_id: unitId,
          rent_amount: parseFloat(leaseForm.rent_amount),
          lease_start: leaseForm.lease_start,
          lease_end: leaseForm.lease_end || null,
          renewal_date: leaseForm.renewal_date || null,
          status: 'active',
        } as any)
      if (lErr) throw new Error(lErr.message)

      await (supabase as any)
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', unitId)

      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = existingTenants.filter(t => {
    const q = search.toLowerCase()
    return !q ||
      `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.primary_phone?.includes(q)
  })

  const dialogTitle = unit
    ? `Assign Tenant — Unit ${unit.unit_code}`
    : preselectedTenantId ? 'Create New Lease' : 'Assign Tenant'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Key className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">{dialogTitle}</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                {unit
                  ? `Unit ${unit.unit_code} · fill in tenant and lease details`
                  : 'Select a vacant unit and assign a tenant'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── UNIT SELECTOR (when no unit pre-selected) ── */}
          {!unit && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Unit</p>
                {availableUnits.length > 0 && (
                  <span className="ml-auto text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    {availableUnits.length} vacant
                  </span>
                )}
              </div>

              {/* Building filter — shown only when multiple buildings have vacant units */}
              {uniqueBuildings.length > 1 && (
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Filter by Building
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setBuildingFilter('all'); setSelectedUnitId('') }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        buildingFilter === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                      }`}>
                      All Buildings
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        buildingFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {availableUnits.length}
                      </span>
                    </button>
                    {uniqueBuildings.map(b => {
                      const count = availableUnits.filter(u => u.buildings?.id === b.id).length
                      return (
                        <button
                          key={b.id}
                          onClick={() => { setBuildingFilter(b.id); setSelectedUnitId('') }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            buildingFilter === b.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                          }`}>
                          <Building2 className="h-3 w-3" />
                          {b.name}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            buildingFilter === b.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Show address of selected building */}
                  {buildingFilter !== 'all' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {uniqueBuildings.find(b => b.id === buildingFilter)?.address ?? 'No address on file'}
                    </div>
                  )}
                </div>
              )}

              {/* Unit cards grid */}
              {loadingUnits ? (
                <div className="text-center py-6 text-xs text-gray-400">Loading units...</div>
              ) : filteredUnits.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                  <Home className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-medium">No vacant units</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {buildingFilter !== 'all' ? 'Try selecting a different building' : 'All units are currently occupied'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredUnits.map(u => {
                    const isSelected = selectedUnitId === u.id
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUnitId(u.id)
                          if (u.default_rent) setLease('rent_amount', u.default_rent.toString())
                        }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:border-emerald-200 hover:bg-white'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-gray-900">{u.unit_code}</p>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[8px] font-bold">✓</span>
                            </span>
                          )}
                        </div>
                        {uniqueBuildings.length > 1 && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
                            <Building2 className="h-2.5 w-2.5" /> {u.buildings?.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 capitalize">
                            {u.unit_type ?? 'Unit'}
                            {u.bedrooms ? ` · ${u.bedrooms}bd` : ''}
                          </span>
                          {u.default_rent && (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              ${Number(u.default_rent).toLocaleString()}/mo
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selected unit summary */}
              {selectedUnit && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Home className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">
                      Unit {selectedUnit.unit_code} selected
                    </p>
                    <p className="text-xs text-emerald-600">
                      {selectedUnit.buildings?.name}
                      {selectedUnit.buildings?.address ? ` · ${selectedUnit.buildings.address}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TENANT SELECTOR ── */}
          {!preselectedTenantId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tenant</p>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {(['existing', 'new'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {t === 'existing' ? 'Existing Tenant' : 'New Tenant'}
                  </button>
                ))}
              </div>

              {/* Existing tenant search list */}
              {tab === 'existing' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input placeholder="Search by name, phone, email..."
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm rounded-lg border-gray-200" />
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    {filteredTenants.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-400">
                          {existingTenants.length === 0
                            ? 'No tenants yet — use New Tenant tab'
                            : 'No tenants match your search'}
                        </p>
                      </div>
                    ) : filteredTenants.map(tenant => (
                      <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                          selectedTenantId === tenant.id ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        }`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          selectedTenantId === tenant.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {(tenant.first_name?.[0] ?? '?').toUpperCase()}{(tenant.last_name?.[0] ?? '').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{tenant.first_name} {tenant.last_name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {tenant.occupation ? `${tenant.occupation} · ` : ''}{tenant.primary_phone ?? tenant.email ?? '—'}
                          </p>
                        </div>
                        {selectedTenantId === tenant.id && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[8px] font-bold">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* New tenant quick form */}
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
                      <Label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</Label>
                      <Input placeholder={placeholder} value={(tenantForm as any)[field]}
                        onChange={e => setTenant(field, e.target.value)}
                        className="h-9 text-sm rounded-lg border-gray-200" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preselected tenant pill */}
          {preselectedTenantId && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                {existingTenants.find(t => t.id === preselectedTenantId)?.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const t = existingTenants.find(t => t.id === preselectedTenantId)
                    return t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Loading...'
                  })()}
                </p>
                <p className="text-xs text-emerald-600 font-medium">Tenant selected</p>
              </div>
            </div>
          )}

          {/* ── LEASE DETAILS ── */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lease Details</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Rent Amount *
                  {(() => {
                    const defaultRent = unit?.default_rent ?? selectedUnit?.default_rent
                    const entered = parseFloat(leaseForm.rent_amount)
                    if (!defaultRent || !leaseForm.rent_amount || isNaN(entered)) return null
                    const diff = entered - Number(defaultRent)
                    const pct = Math.round(Math.abs(diff) / Number(defaultRent) * 100)
                    if (diff === 0) return null
                    return (
                      <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        diff > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {diff > 0 ? `+${pct}% above` : `-${pct}% below`} default
                      </span>
                    )
                  })()}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <Input type="number" min="0" placeholder="0.00" value={leaseForm.rent_amount}
                    onChange={e => setLease('rent_amount', e.target.value)}
                    className={`h-9 text-sm rounded-lg pl-6 ${(() => {
                      const defaultRent = unit?.default_rent ?? selectedUnit?.default_rent
                      const entered = parseFloat(leaseForm.rent_amount)
                      if (!defaultRent || !leaseForm.rent_amount || isNaN(entered)) return 'border-gray-200'
                      const diff = entered - Number(defaultRent)
                      if (diff > 0) return 'border-emerald-300 focus:border-emerald-500'
                      if (diff < 0) return 'border-amber-300 focus:border-amber-500'
                      return 'border-gray-200'
                    })()}`} />
                </div>
                {(() => {
                  const defaultRent = unit?.default_rent ?? selectedUnit?.default_rent
                  if (!defaultRent) return null
                  return (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400">
                        Default: <span className="font-semibold text-gray-600">${Number(defaultRent).toLocaleString()}/mo</span>
                      </p>
                      {leaseForm.rent_amount !== String(defaultRent) && (
                        <button
                          type="button"
                          onClick={() => setLease('rent_amount', String(defaultRent))}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">
                          Reset to default
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date *</Label>
                <Input type="date" value={leaseForm.lease_start}
                  onChange={e => setLease('lease_start', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  End Date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.lease_end}
                  onChange={e => setLease('lease_end', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Renewal Date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.renewal_date}
                  onChange={e => setLease('renewal_date', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="h-9 text-sm rounded-lg px-5">Cancel</Button>
          <Button onClick={handleSave} disabled={loading}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg px-6">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : preselectedTenantId ? 'Create Lease' : 'Assign Tenant & Create Lease'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
