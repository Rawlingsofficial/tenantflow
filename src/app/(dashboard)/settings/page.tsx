'use client'

import { useState } from 'react'
import OrgSettings from '@/components/settings/OrgSettings'
import TeamSettings from '@/components/settings/TeamSettings'
import AccountSettings from '@/components/settings/AccountSettings'
import BillingSettings from '@/components/settings/BillingSettings'
import PermissionsSettings from '@/components/settings/PermissionsSettings'

type Tab = 'organization' | 'team' | 'permissions' | 'billing' | 'account'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('organization')

  const tabs = [
    { id: 'organization', label: 'Organization' },
    { id: 'team', label: 'Team' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'billing', label: 'Billing' },
    { id: 'account', label: 'My account' },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your organization, team, permissions and billing
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'organization' && <OrgSettings />}
      {activeTab === 'team' && <TeamSettings />}
      {activeTab === 'permissions' && <PermissionsSettings />}
      {activeTab === 'billing' && <BillingSettings />}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  )
}

