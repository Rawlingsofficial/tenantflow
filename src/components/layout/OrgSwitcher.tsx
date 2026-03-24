'use client'

/**
 * OrgSwitcher — display-only component showing org name + property type badge.
 *
 * Used in TopNav on mobile/compact contexts. On desktop, the Sidebar's
 * OrgContext block handles the full org display (name, country, role, plan).
 *
 * No switching UI — users create orgs through onboarding only.
 */

import { Building2 } from 'lucide-react'
import { useOrgStore } from '@/store/orgStore'

export default function OrgSwitcher() {
  const { currentOrg } = useOrgStore()

  const typeConfig = {
    residential: { label: 'Residential', dot: 'bg-teal-400' },
    commercial:  { label: 'Commercial',  dot: 'bg-indigo-400' },
    mixed:       { label: 'Mixed',       dot: 'bg-violet-400' },
  }
  const type = typeConfig[currentOrg?.property_type ?? 'residential'] ?? typeConfig.residential

  if (!currentOrg) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] w-40 animate-pulse h-8" />
  )

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] max-w-[200px]">
      <div className="p-1 bg-white/[0.07] rounded flex-shrink-0">
        <Building2 className="h-3.5 w-3.5 text-teal-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-gray-200 truncate leading-tight">
          {currentOrg.name}
        </p>
        <div className="flex items-center gap-1">
          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${type.dot}`} />
          <span className="text-[10px] text-gray-600">{type.label}</span>
        </div>
      </div>
    </div>
  )
}
