'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, User, FileText } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
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

export default function AssignTenantDialog({
  open, onClose, onSaved, unit,
  organizationId, preselectedTenantId
}: Props) {
  const supabase = getSupabaseBrowserClient()
  const [tab, setTab] = useState<Tab>('existing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  // Available units — used when coming from tenant profile (no unit pre-selected)
  const [availableUnits, setAvailableUnits] = useState<(Unit & { buildings?: { name: string } | null })[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')

  const [tenantForm, setTenantFormState] = useState({
    first_name: '', last_name: '', primary_phone: '',
    email: '', occupation: '', country: '',
    secondary_phone: '', date_of_birth: '',
    marital_status: '', employment_type: '',
    employer_name: '', work_address: '', notes: '',
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

      // Pre-fill rent from unit if available
      setLeaseFormState((prev) => ({
        ...prev,
        rent_amount: unit?.default_rent?.toString() ?? '',
        lease_start: new Date().toISOString().split('T')[0],
        lease_end: '',
        renewal_date: '',
      }))

      setError('')
      setSearch('')
      setShowOptional(false)

      // If coming from tenant profile — preselect tenant and load vacant units
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
    const { data } = await supabase
      .from('units')
      .select(`*, buildings!inner ( name, organization_id )`)
      .eq('status', 'vacant')
      .eq('buildings.organization_id', organizationId)
    setAvailableUnits((data as any[]) ?? [])
  }

  function setTenant(field: string, value: string) {
    setTenantFormState((prev) => ({ ...prev, [field]: value }))
  }

  function setLease(field: string, value: string) {
    setLeaseFormState((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    // Determine which unit to use
    const unitId = unit?.id ?? selectedUnitId
    if (!unitId) { setError('Please select a unit'); return }
    if (!leaseForm.rent_amount) { setError('Rent amount is required'); return }
    if (!leaseForm.lease_start) { setError('Lease start date is required'); return }
    if (tab === 'existing' && !selectedTenantId) {
      setError('Please select a tenant'); return
    }
    if (tab === 'new' && !tenantForm.first_name.trim()) {
      setError('First name is required'); return
    }

    setLoading(true)
    setError('')

    try {
      let tenantId = selectedTenantId

      // Create new tenant if needed
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
            secondary_phone: tenantForm.secondary_phone.trim() || null,
            date_of_birth: tenantForm.date_of_birth || null,
            marital_status: tenantForm.marital_status || null,
            employment_type: tenantForm.employment_type || null,
            employer_name: tenantForm.employer_name.trim() || null,
            work_address: tenantForm.work_address.trim() || null,
            notes: tenantForm.notes.trim() || null,
          } as any)
          .select()
          .single() as { data: Tenant | null; error: any }

        if (tErr || !newTenant) throw new Error(tErr?.message || 'Failed to create tenant')
        tenantId = newTenant.id
      }

      // Create lease
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

      // Mark unit as occupied
      const { error: uErr } = await (supabase as any)
  .from('units')
  .update({ status: 'occupied' })
  .eq('id', unitId)

      if (uErr) throw new Error(uErr.message)

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
    return (
      !q ||
      `${t.first_name ?? ''} ${t.last_name ?? ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.primary_phone?.includes(q)
    )
  })

  // Title changes based on context
  const dialogTitle = unit
    ? `Assign tenant — Unit ${unit.unit_code}`
    : preselectedTenantId
      ? 'Create new lease'
      : 'Assign tenant'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {/* Tab switcher — hide if tenant is preselected */}
        {!preselectedTenantId && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                tab === 'existing'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setTab('existing')}
            >
              <User className="h-3.5 w-3.5" />
              Existing tenant
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                tab === 'new'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setTab('new')}
            >
              <User className="h-3.5 w-3.5" />
              New tenant
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Existing tenant selection */}
          {tab === 'existing' && !preselectedTenantId && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tenants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {filteredTenants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">
                      {existingTenants.length === 0
                        ? 'No tenants yet — use New tenant tab'
                        : 'No tenants match your search'}
                    </p>
                  </div>
                ) : (
                  filteredTenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0 ${
                        selectedTenantId === tenant.id
                          ? 'bg-indigo-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        {(tenant.first_name?.[0] ?? '?').toUpperCase()}
                        {(tenant.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {tenant.first_name} {tenant.last_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {tenant.occupation ? `${tenant.occupation} · ` : ''}
                          {tenant.primary_phone ?? tenant.email ?? '—'}
                        </p>
                      </div>
                      {selectedTenantId === tenant.id && (
                        <div className="h-4 w-4 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preselected tenant — show read-only info */}
          {preselectedTenantId && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div className="h-9 w-9 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                {existingTenants.find((t) => t.id === preselectedTenantId)?.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {(() => {
                    const t = existingTenants.find((t) => t.id === preselectedTenantId)
                    return t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Loading...'
                  })()}
                </p>
                <p className="text-xs text-indigo-600">Tenant selected</p>
              </div>
            </div>
          )}

          {/* New tenant form */}
          {tab === 'new' && !preselectedTenantId && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First name *</Label>
                  <Input
                    placeholder="John"
                    value={tenantForm.first_name}
                    onChange={(e) => setTenant('first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input
                    placeholder="Doe"
                    value={tenantForm.last_name}
                    onChange={(e) => setTenant('last_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+237 6XX XXX XXX"
                    value={tenantForm.primary_phone}
                    onChange={(e) => setTenant('primary_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={tenantForm.email}
                    onChange={(e) => setTenant('email', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Occupation</Label>
                  <Input
                    placeholder="e.g. Engineer"
                    value={tenantForm.occupation}
                    onChange={(e) => setTenant('occupation', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    placeholder="e.g. Cameroon"
                    value={tenantForm.country}
                    onChange={(e) => setTenant('country', e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {showOptional ? '− Hide' : '+ Show'} optional fields
              </button>

              {showOptional && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Secondary phone</Label>
                      <Input
                        value={tenantForm.secondary_phone}
                        onChange={(e) => setTenant('secondary_phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date of birth</Label>
                      <Input
                        type="date"
                        value={tenantForm.date_of_birth}
                        onChange={(e) => setTenant('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Marital status</Label>
                      <Select
                        value={tenantForm.marital_status}
                        onValueChange={(v) => setTenant('marital_status', v ?? '')}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Employment type</Label>
                      <Select
                        value={tenantForm.employment_type}
                        onValueChange={(v) => setTenant('employment_type', v ?? '')}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employed">Employed</SelectItem>
                          <SelectItem value="self_employed">Self-employed</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Employer name</Label>
                    <Input
                      value={tenantForm.employer_name}
                      onChange={(e) => setTenant('employer_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Internal notes</Label>
                    <textarea
                      className="w-full min-h-[70px] px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Private notes..."
                      value={tenantForm.notes}
                      onChange={(e) => setTenant('notes', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lease details */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">
                Lease details
              </p>
            </div>

            {/* Unit selector — only when coming from tenant profile */}
            {!unit && (
              <div className="space-y-1.5">
                <Label>Select unit *</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={(v) => {
  setSelectedUnitId(v ?? '')
                    const u = availableUnits.find((u) => u.id === v)
                    if (u?.default_rent) {
                      setLease('rent_amount', u.default_rent.toString())
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vacant unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No vacant units available
                      </SelectItem>
                    ) : (
                      availableUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.buildings?.name} — {u.unit_code}
                          {u.default_rent
                            ? ` · ${Number(u.default_rent).toLocaleString()}/mo`
                            : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rent amount *</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={leaseForm.rent_amount}
                  onChange={(e) => setLease('rent_amount', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start date *</Label>
                <Input
                  type="date"
                  value={leaseForm.lease_start}
                  onChange={(e) => setLease('lease_start', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  End date{' '}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={leaseForm.lease_end}
                  onChange={(e) => setLease('lease_end', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Renewal date{' '}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={leaseForm.renewal_date}
                  onChange={(e) => setLease('renewal_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              : preselectedTenantId
                ? 'Create lease'
                : 'Assign tenant & create lease'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

