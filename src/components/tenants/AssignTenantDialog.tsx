'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, User, FileText, X, Key } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Tenant, Unit } from '@/types'

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
  const [availableUnits, setAvailableUnits] = useState<(Unit & { buildings?: { name: string } | null })[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')

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
    if (open) {
      loadExistingTenants()
      setLeaseFormState((prev) => ({
        ...prev,
        rent_amount: unit?.default_rent?.toString() ?? '',
        lease_start: new Date().toISOString().split('T')[0],
        lease_end: '',
        renewal_date: '',
      }))
      setError('')
      setSearch('')
      if (preselectedTenantId) {
        setSelectedTenantId(preselectedTenantId)
        setTab('existing')
        loadVacantUnits()
      } else {
        setSelectedTenantId('')
        setSelectedUnitId('')
      }
    }
  }, [open, unit, preselectedTenantId])

  async function loadExistingTenants() {
    if (!organizationId) return
    const { data } = await supabase.from('tenants').select('*')
      .eq('organization_id', organizationId).eq('status', 'active').order('first_name')
    setExistingTenants((data as Tenant[]) ?? [])
  }

  async function loadVacantUnits() {
    if (!organizationId) return
    const { data } = await supabase.from('units')
      .select(`*, buildings!inner(name, organization_id)`)
      .eq('status', 'vacant').eq('buildings.organization_id', organizationId)
    setAvailableUnits((data as any[]) ?? [])
  }

  function setTenant(field: string, value: string) { setTenantFormState((prev) => ({ ...prev, [field]: value })) }
  function setLease(field: string, value: string) { setLeaseFormState((prev) => ({ ...prev, [field]: value })) }

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
        const { data: newTenant, error: tErr } = await supabase.from('tenants').insert({
          organization_id: organizationId,
          first_name: tenantForm.first_name.trim(),
          last_name: tenantForm.last_name.trim() || null,
          primary_phone: tenantForm.primary_phone.trim() || null,
          email: tenantForm.email.trim() || null,
          occupation: tenantForm.occupation.trim() || null,
          country: tenantForm.country.trim() || null,
        } as any).select().single() as { data: Tenant | null; error: any }
        if (tErr || !newTenant) throw new Error(tErr?.message || 'Failed to create tenant')
        tenantId = newTenant.id
      }

      const { error: lErr } = await supabase.from('leases').insert({
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

      await (supabase as any).from('units').update({ status: 'occupied' }).eq('id', unitId)

      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = existingTenants.filter((t) => {
    const q = search.toLowerCase()
    return !q || `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) || t.primary_phone?.includes(q)
  })

  const dialogTitle = unit ? `Assign Tenant — Unit ${unit.unit_code}` : preselectedTenantId ? 'Create New Lease' : 'Assign Tenant'

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
                {unit ? `Building · ${unit.unit_code}` : 'Select a unit and create a lease'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Tab switcher */}
          {!preselectedTenantId && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(['existing', 'new'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <User className="h-3.5 w-3.5" />
                  {t === 'existing' ? 'Existing Tenant' : 'New Tenant'}
                </button>
              ))}
            </div>
          )}

          {/* Existing tenant list */}
          {tab === 'existing' && !preselectedTenantId && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input placeholder="Search tenants..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {filteredTenants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">
                      {existingTenants.length === 0 ? 'No tenants yet — use New Tenant tab' : 'No tenants match your search'}
                    </p>
                  </div>
                ) : filteredTenants.map((tenant) => (
                  <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                      selectedTenantId === tenant.id ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      selectedTenantId === tenant.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {(tenant.first_name?.[0] ?? '?').toUpperCase()}{(tenant.last_name?.[0] ?? '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{tenant.first_name} {tenant.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {tenant.occupation ? `${tenant.occupation} · ` : ''}{tenant.primary_phone ?? tenant.email ?? '—'}
                      </p>
                    </div>
                    {selectedTenantId === tenant.id && (
                      <div className="h-4 w-4 rounded-full bg-emerald-600 shrink-0 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preselected tenant pill */}
          {preselectedTenantId && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                {existingTenants.find((t) => t.id === preselectedTenantId)?.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {(() => { const t = existingTenants.find((t) => t.id === preselectedTenantId); return t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Loading...' })()}
                </p>
                <p className="text-xs text-emerald-600 font-medium">Tenant selected</p>
              </div>
            </div>
          )}

          {/* New tenant form */}
          {tab === 'new' && !preselectedTenantId && (
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
                    onChange={(e) => setTenant(field, e.target.value)}
                    className="h-9 text-sm rounded-lg border-gray-200" />
                </div>
              ))}
            </div>
          )}

          {/* Lease details */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lease Details</p>
            </div>

            {!unit && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Select Unit *</Label>
                <Select value={selectedUnitId}
                  // @ts-ignore
                  onValueChange={(v: string) => {
                    setSelectedUnitId(v ?? '')
                    const u = availableUnits.find((u) => u.id === v)
                    if (u?.default_rent) setLease('rent_amount', u.default_rent.toString())
                  }}>
                  <SelectTrigger className="h-9 text-sm rounded-lg border-gray-200"><SelectValue placeholder="Choose a vacant unit..." /></SelectTrigger>
                  <SelectContent>
                    {availableUnits.length === 0
                      ? <SelectItem value="none" disabled>No vacant units available</SelectItem>
                      : availableUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.buildings?.name} — {u.unit_code}{u.default_rent ? ` · $${Number(u.default_rent).toLocaleString()}/mo` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Rent Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <Input type="number" min="0" placeholder="0.00" value={leaseForm.rent_amount}
                    onChange={(e) => setLease('rent_amount', e.target.value)}
                    className="h-9 text-sm rounded-lg border-gray-200 pl-6" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date *</Label>
                <Input type="date" value={leaseForm.lease_start}
                  onChange={(e) => setLease('lease_start', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  End Date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.lease_end}
                  onChange={(e) => setLease('lease_end', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Renewal Date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input type="date" value={leaseForm.renewal_date}
                  onChange={(e) => setLease('renewal_date', e.target.value)}
                  className="h-9 text-sm rounded-lg border-gray-200" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-9 text-sm rounded-lg px-5">Cancel</Button>
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
