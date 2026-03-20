'use client'

import { format, differenceInMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReportData } from '@/app/(dashboard)/reports/page'

interface Props { data: ReportData }

export default function TenantReport({ data }: Props) {
  const activeTenants = data.tenants.filter((t) => t.status === 'active')
  const inactiveTenants = data.tenants.filter((t) => t.status === 'inactive')

  // Tenants with active leases
  const tenantsWithLeases = activeTenants.filter((t) =>
    t.leases?.some((l) => l.status === 'active')
  )

  // Tenants without active leases (active but no lease)
  const tenantsWithoutLeases = activeTenants.filter((t) =>
    !t.leases?.some((l) => l.status === 'active')
  )

  // Average tenure — months since lease start
  const tenures = activeTenants
    .map((t) => {
      const activeLease = t.leases?.find((l) => l.status === 'active')
      if (!activeLease) return 0
      return differenceInMonths(new Date(), new Date(activeLease.lease_start))
    })
    .filter((m) => m > 0)

  const avgTenure = tenures.length > 0
    ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length)
    : 0

  // Occupation breakdown
  const occupations = activeTenants
    .reduce((acc: Record<string, number>, t) => {
      const occ = t.occupation ?? 'Unknown'
      acc[occ] = (acc[occ] ?? 0) + 1
      return acc
    }, {})

  const topOccupations = Object.entries(occupations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const stats = [
    {
      label: 'Total tenants',
      value: data.tenants.length,
      sub: 'All time',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Active tenants',
      value: activeTenants.length,
      sub: 'Currently active',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Avg. tenure',
      value: `${avgTenure}mo`,
      sub: 'Average lease duration',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Inactive',
      value: inactiveTenants.length,
      sub: 'Past tenants',
      color: 'text-slate-500',
      bg: 'bg-slate-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-slate-200 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupation breakdown */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Tenant occupations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOccupations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {topOccupations.map(([occ, count]) => {
                  const pct = activeTenants.length > 0
                    ? Math.round((count / activeTenants.length) * 100)
                    : 0
                  return (
                    <div key={occ} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-700 font-medium capitalize">{occ}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{pct}%</span>
                          <span className="text-sm font-bold text-slate-900">{count}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenure breakdown */}
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Tenant tenure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTenants.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No active tenants</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 col-span-2">Tenant</span>
                  <span className="text-xs font-semibold text-slate-400 text-right">Since</span>
                  <span className="text-xs font-semibold text-slate-400 text-right">Duration</span>
                </div>
                {activeTenants
                  .map((t) => {
                    const activeLease = t.leases?.find((l) => l.status === 'active')
                    const months = activeLease
                      ? differenceInMonths(new Date(), new Date(activeLease.lease_start))
                      : 0
                    return { t, months, activeLease }
                  })
                  .sort((a, b) => b.months - a.months)
                  .slice(0, 8)
                  .map(({ t, months, activeLease }) => (
                    <div key={t.id} className="grid grid-cols-4 gap-2 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-slate-900">
                          {`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {t.occupation ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">
                          {activeLease ? format(new Date(activeLease.lease_start), 'MMM yyyy') : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          months >= 12 ? 'text-emerald-600'
                          : months >= 6 ? 'text-indigo-600'
                          : 'text-slate-600'
                        }`}>
                          {months}mo
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tenants without leases warning */}
      {tenantsWithoutLeases.length > 0 && (
        <Card className="border border-amber-200 shadow-none bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">
              ⚠ Active tenants without a lease ({tenantsWithoutLeases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tenantsWithoutLeases.map((t) => (
                <Badge
                  key={t.id}
                  className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                >
                  {`${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unknown'}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3">
              These tenants are marked as active but have no active lease. Consider creating a lease or archiving them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

