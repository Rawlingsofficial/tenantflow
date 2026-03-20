'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Plus } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import BuildingsTable from '@/components/buildings/BuildingsTable'
import AddBuildingDialog from '@/components/buildings/AddBuildingDialog'
import AddUnitDialog from '@/components/buildings/AddUnitDialog'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import UnitHistoryDialog from '@/components/buildings/UnitHistoryDialog'
import type { Building, Unit } from '@/types'

interface UnitWithTenant extends Unit {
  leases?: {
    status: string
    tenants: {
      first_name: string | null
      last_name: string | null
    } | null
  }[]
}

interface BuildingWithUnits extends Building {
  units: UnitWithTenant[]
}

export default function BuildingsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([])
  const [loading, setLoading] = useState(true)

  // Building dialog
  const [buildingDialog, setBuildingDialog] = useState(false)
  const [editBuilding, setEditBuilding] = useState<Building | null>(null)

  // Unit dialog
  const [unitDialog, setUnitDialog] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [editUnit, setEditUnit] = useState<Unit | null>(null)

  // Assign tenant dialog
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignUnit, setAssignUnit] = useState<Unit | null>(null)

  // History dialog
  const [historyDialog, setHistoryDialog] = useState(false)
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null)

  useEffect(() => {
    if (orgId) loadBuildings()
  }, [orgId])

  async function loadBuildings() {
    setLoading(true)
    const { data } = await supabase
      .from('buildings')
      .select(`
        *,
        units (
          *,
          leases (
            status,
            tenants ( first_name, last_name )
          )
        )
      `)
      .eq('organization_id', orgId!)
      .eq('status', 'active')
      .order('name')

    setBuildings((data as BuildingWithUnits[]) ?? [])
    setLoading(false)
  }

  function handleBuildingSaved(building: Building) {
    setBuildings((prev) => {
      const exists = prev.find((b) => b.id === building.id)
      if (exists) return prev.map((b) => b.id === building.id ? { ...b, ...building } : b)
      return [...prev, { ...building, units: [] }]
    })
  }

  function handleBuildingDeleted(buildingId: string) {
    setBuildings((prev) => prev.filter((b) => b.id !== buildingId))
  }

  function handleUnitSaved(unit: Unit) {
    setBuildings((prev) =>
      prev.map((b) => {
        if (b.id !== unit.building_id) return b
        const exists = b.units.find((u) => u.id === unit.id)
        if (exists) return { ...b, units: b.units.map((u) => u.id === unit.id ? { ...u, ...unit } : u) }
        return { ...b, units: [...b.units, { ...unit, leases: [] }] }
      })
    )
  }

  function handleUnitDeleted(unitId: string) {
    setBuildings((prev) =>
      prev.map((b) => ({ ...b, units: b.units.filter((u) => u.id !== unitId) }))
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Buildings</h1>
          <p className="text-slate-500 text-sm mt-1">
            {buildings.length} building{buildings.length !== 1 ? 's' : ''} ·{' '}
            {buildings.reduce((acc, b) => acc + b.units.length, 0)} total units
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => { setEditBuilding(null); setBuildingDialog(true) }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add building
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <BuildingsTable
          buildings={buildings}
          onAddUnit={(buildingId) => {
            setSelectedBuildingId(buildingId)
            setEditUnit(null)
            setUnitDialog(true)
          }}
          onEditUnit={(unit) => {
            setSelectedBuildingId(unit.building_id)
            setEditUnit(unit)
            setUnitDialog(true)
          }}
          onAssignTenant={(unit) => {
            setAssignUnit(unit)
            setAssignDialog(true)
          }}
          onEditBuilding={(building) => {
            setEditBuilding(building)
            setBuildingDialog(true)
          }}
          onViewHistory={(unit) => {
            setHistoryUnit(unit)
            setHistoryDialog(true)
          }}
        />
      )}

      {/* Add / Edit building */}
      <AddBuildingDialog
        open={buildingDialog}
        onClose={() => setBuildingDialog(false)}
        onSaved={handleBuildingSaved}
        onDeleted={handleBuildingDeleted}
        organizationId={orgId ?? ''}
        editBuilding={editBuilding}
      />

      {/* Add / Edit unit */}
      <AddUnitDialog
        open={unitDialog}
        onClose={() => setUnitDialog(false)}
        onSaved={handleUnitSaved}
        onDeleted={handleUnitDeleted}
        onAssignTenant={(unit) => {
          setAssignUnit(unit)
          setAssignDialog(true)
        }}
        buildingId={selectedBuildingId}
        editUnit={editUnit}
      />

      {/* Assign tenant */}
      <AssignTenantDialog
        open={assignDialog}
        onClose={() => setAssignDialog(false)}
        onSaved={loadBuildings}
        unit={assignUnit}
        organizationId={orgId ?? ''}
      />

      {/* Unit history */}
      <UnitHistoryDialog
        open={historyDialog}
        onClose={() => setHistoryDialog(false)}
        unit={historyUnit}
      />
    </div>
  )
}

