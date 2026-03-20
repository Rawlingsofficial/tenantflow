'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Building2,
  Home, Plus, Pencil, UserPlus,
  CheckCircle2, Clock, Wrench, History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
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

interface Props {
  buildings: BuildingWithUnits[]
  onAddUnit: (buildingId: string) => void
  onEditUnit: (unit: Unit) => void
  onAssignTenant: (unit: Unit) => void
  onEditBuilding: (building: Building) => void
  onViewHistory: (unit: Unit) => void
}

const statusConfig = {
  occupied: {
    label: 'Occupied',
    class: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  vacant: {
    label: 'Vacant',
    class: 'bg-amber-100 text-amber-700',
    icon: Clock,
    iconClass: 'text-amber-500',
  },
  maintenance: {
    label: 'Maintenance',
    class: 'bg-red-100 text-red-600',
    icon: Wrench,
    iconClass: 'text-red-400',
  },
}

export default function BuildingsTable({
  buildings, onAddUnit, onEditUnit,
  onAssignTenant, onEditBuilding, onViewHistory
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (buildings.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">No buildings yet</p>
        <p className="text-xs mt-1">Add your first building to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {buildings.map((building) => {
        const isOpen = expanded.has(building.id)
        const total = building.units.length
        const occupied = building.units.filter((u) => u.status === 'occupied').length
        const vacant = building.units.filter((u) => u.status === 'vacant').length
        const maintenance = building.units.filter((u) => u.status === 'maintenance').length

        return (
          <div
            key={building.id}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
          >
            {/* Building header */}
            <div
              className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggle(building.id)}
            >
              <div className="text-slate-400 shrink-0">
                {isOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
                }
              </div>

              <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {building.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {building.address ?? 'No address provided'}
                </p>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 mr-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{total}</p>
                  <p className="text-xs text-slate-400">units</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{occupied}</p>
                  <p className="text-xs text-slate-400">occupied</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-500">{vacant}</p>
                  <p className="text-xs text-slate-400">vacant</p>
                </div>
                {maintenance > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-500">{maintenance}</p>
                    <p className="text-xs text-slate-400">maintenance</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onEditBuilding(building)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => onAddUnit(building.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add unit
                </Button>
              </div>
            </div>

            {/* Units table */}
            {isOpen && (
              <div className="border-t border-slate-100">
                {building.units.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No units yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs"
                      onClick={() => onAddUnit(building.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add first unit
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-xs font-semibold text-slate-500">Unit</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Rooms</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Rent / month</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">Current tenant</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {building.units.map((unit) => {
                        const config = statusConfig[unit.status]
                        const StatusIcon = config.icon
                        const activeLease = unit.leases?.find((l) => l.status === 'active')
                        const tenant = activeLease?.tenants
                        const tenantName = tenant
                          ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()
                          : null

                        return (
                          <TableRow key={unit.id} className="hover:bg-slate-50 bg-white">
                            {/* Unit code */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded">
                                  <Home className="h-3 w-3 text-slate-500" />
                                </div>
                                <span className="text-sm font-semibold text-slate-900">
                                  {unit.unit_code}
                                </span>
                              </div>
                            </TableCell>

                            {/* Type */}
                            <TableCell className="text-sm text-slate-600">
                              {unit.unit_type ?? <span className="text-slate-300">—</span>}
                            </TableCell>

                            {/* Rooms */}
                            <TableCell className="text-sm text-slate-600">
                              <div className="flex flex-wrap gap-1">
                                {unit.bedrooms !== null && unit.bedrooms > 0 && (
                                  <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                    {unit.bedrooms} bed
                                  </span>
                                )}
                                {unit.bathrooms !== null && unit.bathrooms > 0 && (
                                  <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                    {unit.bathrooms} toilet
                                  </span>
                                )}
                                {!unit.bedrooms && !unit.bathrooms && (
                                  <span className="text-slate-300">—</span>
                                )}
                              </div>
                            </TableCell>

                            {/* Rent */}
                            <TableCell className="text-sm font-medium text-slate-700">
                              {unit.default_rent
                                ? Number(unit.default_rent).toLocaleString()
                                : <span className="text-slate-300">—</span>
                              }
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.class}`}>
                                <StatusIcon className={`h-3 w-3 ${config.iconClass}`} />
                                {config.label}
                              </span>
                            </TableCell>

                            {/* Tenant */}
                            <TableCell>
                              {tenantName ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                                    {tenantName[0]?.toUpperCase()}
                                  </div>
                                  <span className="text-sm text-slate-700">
                                    {tenantName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-sm">—</span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* History */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                                  onClick={() => onViewHistory(unit)}
                                  title="View tenant history"
                                >
                                  <History className="h-3 w-3" />
                                </Button>

                                {/* Edit */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                                  onClick={() => onEditUnit(unit)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>

                                {/* Assign — only on vacant */}
                                {unit.status === 'vacant' && (
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => onAssignTenant(unit)}
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Assign
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


