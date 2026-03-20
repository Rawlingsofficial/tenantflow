'use client'

import { Building2 } from 'lucide-react'
import { useOrgStore } from '@/store/orgStore'

export default function OrgSwitcher() {
  const { currentOrg } = useOrgStore()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-default max-w-[200px]">
      <div className="p-1 bg-indigo-100 rounded shrink-0">
        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
      </div>
      <span className="text-sm font-medium text-slate-700 truncate">
        {currentOrg?.name ?? 'Loading...'}
      </span>
    </div>
  )
}

