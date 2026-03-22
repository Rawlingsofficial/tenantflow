'use client'

import { Building2 } from 'lucide-react'
import { useOrgStore } from '@/store/orgStore'
import { usePropertyType } from '@/hooks/usePropertyType'

// Shows org name + portfolio type badge — no switching allowed,
// switching orgs would bypass the onboarding property_type requirement.
// Users create new orgs through the onboarding flow only.
export default function OrgSwitcher() {
  const { currentOrg } = useOrgStore()
  const { type, loading } = usePropertyType()

  const typeBadge = {
    residential: { label: 'Residential', color: 'bg-emerald-100 text-emerald-700' },
    commercial:  { label: 'Commercial',  color: 'bg-blue-100 text-blue-700' },
    mixed:       { label: 'Mixed',       color: 'bg-violet-100 text-violet-700' },
  }[type] ?? { label: '', color: '' }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 max-w-[240px]">
      <div className="p-1 bg-[#1B3B6F]/10 rounded shrink-0">
        <Building2 className="h-3.5 w-3.5 text-[#1B3B6F]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
          {currentOrg?.name ?? 'Loading...'}
        </p>
        {!loading && typeBadge.label && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeBadge.color}`}>
            {typeBadge.label}
          </span>
        )}
      </div>
    </div>
  )
}

