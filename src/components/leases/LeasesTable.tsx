'use client'

import { useRouter } from 'next/navigation'
import { FileText, AlertCircle, CheckCircle2, XCircle, Clock, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { differenceInDays, format } from 'date-fns'
import type { LeaseWithDetails } from '@/types'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface Props {
  leases: LeaseWithDetails[]
  onViewDetail: (lease: LeaseWithDetails) => void
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active:     { label: 'Active',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ended:      { label: 'Ended',       bg: 'bg-gray-100',   text: 'text-gray-500'   },
  terminated: { label: 'Terminated',  bg: 'bg-red-50',     text: 'text-red-600'    },
}

function LeaseEndBadge({ leaseEnd, status }: { leaseEnd: string | null; status: string }) {
  if (status !== 'active') return null
  if (!leaseEnd) return <span className="text-xs text-emerald-600 font-medium">Open-ended</span>

  const days = differenceInDays(new Date(leaseEnd), new Date())
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
    </span>
  )
  if (days <= 30) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="h-3 w-3" /> Expiring Soon
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  )
}

export default function LeasesTable({ leases, onViewDetail }: Props) {
  const router = useRouter()

  if (leases.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No leases found</p>
        <p className="text-xs text-gray-400 mt-1">
          Assign a tenant to a unit from the{' '}
          <a href="/buildings" className="text-emerald-600 hover:underline">Buildings</a> page
        </p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-50 bg-gray-50/50">
          {['Lease', 'Unit', 'Tenant', 'Start Date', 'Rent', 'Status', ''].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leases.map((lease) => {
          const tenant = (lease as any).tenants
          const unit = (lease as any).units
          const building = unit?.buildings
          const fullName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
          const initials = `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()
          const cfg = statusConfig[lease.status] ?? statusConfig.ended
          const leaseEnd = lease.lease_end
          const days = leaseEnd ? differenceInDays(new Date(leaseEnd), new Date()) : null
          const isExpiringSoon = lease.status === 'active' && days !== null && days <= 30

          return (
            <tr key={lease.id}
              className={`border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors group ${isExpiringSoon ? 'bg-amber-50/20' : ''}`}
              onClick={() => onViewDetail(lease)}>

              {/* Lease / avatar */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border border-gray-100">
                    {tenant?.photo_url ? (
                      <img src={tenant.photo_url} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-700">
                        {initials || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fullName || '—'}</p>
                    <p className="text-[11px] text-gray-400">{tenant?.primary_phone ?? tenant?.email ?? '—'}</p>
                  </div>
                </div>
              </td>

              {/* Unit */}
              <td className="px-4 py-3.5">
                <p className="text-sm font-semibold text-gray-800">{unit?.unit_code ?? '—'}</p>
                <p className="text-[11px] text-gray-400">{building?.name ?? '—'}</p>
              </td>

              {/* Tenant name */}
              <td className="px-4 py-3.5 text-sm text-gray-600">{fullName || '—'}</td>

              {/* Start date */}
              <td className="px-4 py-3.5">
                <p className="text-sm text-gray-600">{format(new Date(lease.lease_start), 'MMM d, yyyy')}</p>
                {leaseEnd && (
                  <p className="text-[11px] text-gray-400">→ {format(new Date(leaseEnd), 'MMM d, yyyy')}</p>
                )}
              </td>

              {/* Rent */}
              <td className="px-4 py-3.5">
                <span className="text-sm font-semibold text-gray-800">
                  ${Number(lease.rent_amount).toLocaleString()}
                </span>
                <span className="text-[11px] text-gray-400 ml-0.5">/mo</span>
              </td>

              {/* Status badge */}
              <td className="px-4 py-3.5">
                <LeaseEndBadge leaseEnd={leaseEnd ?? null} status={lease.status} />
                {lease.status !== 'active' && (
                  <span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs w-40">
                    <DropdownMenuItem onClick={() => onViewDetail(lease)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/tenants/${lease.tenant_id}`)}>View Tenant</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

