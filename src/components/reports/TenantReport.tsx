'use client'

import { format, differenceInMonths } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { ReportData } from '@/types/reports'

interface Props { data: ReportData }

export default function TenantReport({ data }: Props) {
  const activeTenants = data.tenants.filter(t => t.status === 'active')
  const inactiveTenants = data.tenants.filter(t => t.status === 'inactive')

  const tenantsWithLeases = activeTenants.filter(t => t.leases?.some(l => l.status === 'active'))
  const tenantsWithoutLeases = activeTenants.filter(t => !t.leases?.some(l => l.status === 'active'))

  const tenures = activeTenants
    .map(t => {
      const activeLease = t.leases?.find(l => l.status === 'active')
      if (!activeLease) return 0
      return differenceInMonths(new Date(), new Date(activeLease.lease_start))
    })
    .filter(m => m > 0)

  const avgTenure = tenures.length > 0
    ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length)
    : 0

  const occupations = activeTenants.reduce((acc: Record<string, number>, t) => {
    const occ = t.occupation ?? 'Unknown'
    acc[occ] = (acc[occ] ?? 0) + 1
    return acc
  }, {})

  const topOccupations = Object.entries(occupations).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: data.tenants.length, sub: 'All time', color: 'text-gray-800' },
          { label: 'Active', value: activeTenants.length, sub: 'Currently active', color: 'text-emerald-600' },
          { label: 'Avg. Tenure', value: `${avgTenure}mo`, sub: 'Average lease duration', color: 'text-blue-600' },
          { label: 'Inactive', value: inactiveTenants.length, sub: 'Past tenants', color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupation breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Tenant Occupations</p>
          {topOccupations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {topOccupations.map(([occ, count]) => {
                const pct = activeTenants.length > 0 ? Math.round((count / activeTenants.length) * 100) : 0
                return (
                  <div key={occ} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium capitalize">{occ}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{pct}%</span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tenure table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Tenant Tenure</p>
          {activeTenants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active tenants</p>
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-2 pb-2 border-b border-gray-100">
                <span className="text-[10px] font-semibold text-gray-400 col-span-2">Tenant</span>
                <span className="text-[10px] font-semibold text-gray-400 text-right">Since</span>
                <span className="text-[10px] font-semibold text-gray-400 text-right">Duration</span>
              </div>
              {activeTenants
                .map(t => {
                  const activeLease = t.leases?.find(l => l.status === 'active')
                  const months = activeLease ? differenceInMonths(new Date(), new Date(activeLease.lease_start)) : 0
                  return { t, months, activeLease }
                })
                .sort((a, b) => b.months - a.months)
                .slice(0, 8)
                .map(({ t, months, activeLease }) => (
                  <div key={t.id} className="grid grid-cols-4 gap-2 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{t.occupation ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {activeLease ? format(new Date(activeLease.lease_start), 'MMM yyyy') : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${months >= 12 ? 'text-emerald-600' : months >= 6 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {months}mo
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Tenants without leases warning */}
      {tenantsWithoutLeases.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            ⚠ {tenantsWithoutLeases.length} active tenant{tenantsWithoutLeases.length > 1 ? 's' : ''} without a lease
          </p>
          <div className="flex flex-wrap gap-2">
            {tenantsWithoutLeases.map(t => (
              <span key={t.id} className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-600">
            These tenants are active but have no active lease. Consider creating a lease or archiving them.
          </p>
        </div>
      )}
    </div>
  )
}



