"use client";

import { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import AccountSettings from "@/components/settings/AccountSettings";
import OrgSettings from "@/components/settings/OrgSettings";
import TeamSettings from "@/components/settings/TeamSettings";
import PermissionsSettings from "@/components/settings/PermissionsSettings";
import BillingSettings from "@/components/settings/BillingSettings";
import {
  User,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

const TABS = [
  { id: "account", label: "Account", icon: User, permission: null },
  { id: "organization", label: "Organization", icon: Building2, permission: "settings.edit_org" },
  { id: "team", label: "Team", icon: Users, permission: "settings.manage_team" },
  { id: "permissions", label: "Permissions", icon: ShieldCheck, permission: "settings.manage_permissions" },
  { id: "billing", label: "Billing", icon: CreditCard, permission: "settings.manage_billing" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const { role } = useRole();

  const visibleTabs = TABS.filter((tab) => {
    if (!tab.permission) return true;
    if (!role) return false;
    return hasPermission(role, tab.permission as any);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account, organization, and team preferences.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <aside className="w-52 shrink-0">
            <nav className="space-y-0.5">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-gray-700" : "text-gray-400"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {activeTab === "account" && <AccountSettings />}
            {activeTab === "organization" && <OrgSettings />}
            {activeTab === "team" && <TeamSettings />}
            {activeTab === "permissions" && <PermissionsSettings />}
            {activeTab === "billing" && <BillingSettings />}
          </main>
        </div>
      </div>
    </div>
  );
}

