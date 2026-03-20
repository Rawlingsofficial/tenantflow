'use client'

import { useState } from 'react'
import OrgSettings from '@/components/settings/OrgSettings'
import TeamSettings from '@/components/settings/TeamSettings'
import AccountSettings from '@/components/settings/AccountSettings'

type Tab = 'organization' | 'team' | 'account'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('organization')

  const tabs = [
    { id: 'organization', label: 'Organization' },
    { id: 'team', label: 'Team' },
    { id: 'account', label: 'My account' },
  ] as const

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your organization, team and account
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#0f1f3d] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'organization' && <OrgSettings />}
      {activeTab === 'team' && <TeamSettings />}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  )
}

