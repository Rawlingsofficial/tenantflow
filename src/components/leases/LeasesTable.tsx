'use client'

import { motion } from 'framer-motion'
import { FileText, AlertCircle, ArrowUpRight } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import type { LeaseWithDetails } from '@/types'

interface Props {
  leases: LeaseWithDetails[]
  onViewDetail: (lease: LeaseWithDetails) => void
  mode?: 'residential' | 'commercial'
}

function StatusBadge({ lease }: { lease: LeaseWithDetails }) {
  const { status, lease_end } = lease
  const days = lease_end ? differenceInDays(new Date(lease_end), new Date()) : null

  if (status === 'terminated') return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Terminated
    </span>
  )
  if (status === 'ended') return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Ended
    </span>
  )
  if (status === 'active') {
    if (days === null) return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Active
      </span>
    )
    if (days < 0) return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
      </span>
    )
    if (days <= 30) return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="h-3 w-3" /> Expiring Soon
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Active
      </span>
    )
  }
  return null
}

export default function LeasesTable({ leases, onViewDetail, mode = 'residential' }: Props) {
  const isCommercial = mode === 'commercial'

  if (leases.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <FileText className="h-5 w-5 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">No leases found</p>
        <p className="text-xs text-slate-400 mt-1">
          Assign a tenant to a unit from the{' '}
          <a href="/buildings" className="text-teal-600 hover:underline font-medium">Buildings</a> page
        </p>
      </div>
    )
  }

  const activeRevenue = leases
    .filter(l => l.status === 'active')
    .reduce((s, l) => s + Number(l.rent_amount) + Number((l as any).service_charge ?? 0), 0)

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isCommercial ? 'Company / Tenant' : 'Tenant'}
          </th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isCommercial ? 'Space' : 'Unit'}
          </th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isCommercial ? 'Rent + Charges' : 'Monthly Rent'}
          </th>
          {isCommercial && (
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Escalation</th>
          )}
          <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
          <th className="px-4 py-3 w-8" />
        </tr>
      </thead>
      <tbody>
        {leases.map((lease, i) => {
          const tenant  = (lease as any).tenants
          const unit    = (lease as any).units
          const building = unit?.buildings
          const isCompany = tenant?.tenant_type === 'company'
          const displayName = isCompany
            ? (tenant?.company_name ?? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim())
            : `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
          const initial = isCompany
            ? (tenant?.company_name ?? 'C')[0].toUpperCase()
            : `${tenant?.first_name?.[0] ?? ''}${tenant?.last_name?.[0] ?? ''}`.toUpperCase()
          const subtext = isCompany
            ? (tenant?.industry ?? tenant?.contact_person ?? '—')
            : (tenant?.primary_phone ?? tenant?.email ?? '—')
          const leaseEnd = lease.lease_end
          const days = leaseEnd ? differenceInDays(new Date(leaseEnd), new Date()) : null
          const rowHighlight =
            lease.status === 'active' && days !== null && days < 0   ? 'bg-red-50/20 hover:bg-red-50/35' :
            lease.status === 'active' && days !== null && days <= 30  ? 'bg-amber-50/30 hover:bg-amber-50/50' :
            'hover:bg-slate-50/60'
          const sc    = Number((lease as any).service_charge ?? 0)
          const total = Number(lease.rent_amount) + sc

          return (
            <motion.tr
              key={lease.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.25 }}
              className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors group ${rowHighlight}`}
              onClick={() => onViewDetail(lease)}
            >
              {/* Tenant/Company avatar + name */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] border border-[#1B3B6F]/20 flex items-center justify-center text-xs font-bold text-[#14b8a6] shadow-sm overflow-hidden">
                    {tenant?.photo_url
                      ? <img src={tenant.photo_url} alt={displayName} className="w-full h-full object-cover" />
                      : (initial || '?')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {displayName || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">{subtext}</p>
                  </div>
                </div>
              </td>

              {/* Unit/Space */}
              <td className="px-4 py-3.5">
                <p className="text-sm font-semibold text-slate-800 font-mono">{unit?.unit_code ?? '—'}</p>
                <p className="text-[11px] text-slate-400">{building?.name ?? '—'}</p>
              </td>

              {/* Duration */}
              <td className="px-4 py-3.5">
                <p className="text-sm text-slate-600">{format(new Date(lease.lease_start), 'MMM d, yyyy')}</p>
                {leaseEnd
                  ? <p className="text-[11px] text-slate-400">→ {format(new Date(leaseEnd), 'MMM d, yyyy')}</p>
                  : <p className="text-[11px] text-teal-500 font-medium">Open-ended</p>}
              </td>

              {/* Rent */}
              <td className="px-4 py-3.5">
                {isCommercial && sc > 0 ? (
                  <div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums">${total.toLocaleString()}/mo</p>
                    <p className="text-[10px] text-slate-400">
                      ${Number(lease.rent_amount).toLocaleString()} + ${sc.toLocaleString()} SC
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    ${Number(lease.rent_amount).toLocaleString()}/mo
                  </p>
                )}
              </td>

              {/* Commercial: escalation */}
              {isCommercial && (
                <td className="px-4 py-3.5">
                  {(lease as any).escalation_rate ? (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      {(lease as any).escalation_rate}%/yr
                    </span>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                </td>
              )}

              {/* Status */}
              <td className="px-4 py-3.5"><StatusBadge lease={lease} /></td>

              {/* Arrow */}
              <td className="px-4 py-3.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </td>
            </motion.tr>
          )
        })}
      </tbody>

      <tfoot>
        <tr className="border-t border-slate-100 bg-slate-50/50">
          <td className="px-5 py-2.5" colSpan={isCommercial ? 4 : 3}>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span className="font-bold text-slate-700">{leases.filter(l => l.status === 'active').length}</span> active
              </span>
              <span className="text-slate-300">·</span>
              <span><span className="font-bold text-slate-700">{leases.filter(l => l.status === 'ended').length}</span> ended</span>
              <span className="text-slate-300">·</span>
              <span><span className="font-bold text-slate-700">{leases.filter(l => l.status === 'terminated').length}</span> terminated</span>
              <span className="text-slate-300">·</span>
              <span className="font-bold text-slate-700">{leases.length}</span> total
            </div>
          </td>
          <td className="px-4 py-2.5 text-right" colSpan={isCommercial ? 3 : 4}>
            <span className="text-xs text-slate-400">
              ${activeRevenue.toLocaleString()}/mo active revenue
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

