"use client";

import { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import AccountSettings from "@/components/settings/AccountSettings";
import OrgSettings from "@/components/settings/OrgSettings";
import TeamSettings from "@/components/settings/TeamSettings";
import PermissionsSettings from "@/components/settings/PermissionsSettings";
import BillingSettings from "@/components/settings/BillingSettings";
import { User, Building2, Users, ShieldCheck, CreditCard } from "lucide-react";
import type { Permission } from "@/lib/permissions";

const TABS = [
  {
    id: "account"      as const,
    label: "Account",
    icon: User,
    permission: null as Permission | null,
  },
  {
    id: "organization" as const,
    label: "Organization",
    icon: Building2,
    permission: "settings.edit_org" as Permission,
  },
  {
    id: "team"         as const,
    label: "Team",
    icon: Users,
    permission: "settings.manage_team" as Permission,
  },
  {
    id: "permissions"  as const,
    label: "Permissions",
    icon: ShieldCheck,
    permission: "settings.view" as Permission,
  },
  {
    id: "billing"      as const,
    label: "Billing",
    icon: CreditCard,
    permission: "settings.manage_billing" as Permission,
  },
];

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const { role, loading } = useRole();

  /**
   * KEY FIX:
   * - While loading=true → show ALL tabs (greyed/disabled), never hide them.
   * - Once loading=false AND role is known → filter by permission.
   * - Once loading=false AND role is null → only show Account tab.
   *
   * This prevents the "flash then disappear" caused by tabs rendering
   * visible during loading, then collapsing when role resolves to null.
   */
  const visibleTabs = TABS.filter((tab) => {
    if (!tab.permission) return true;        // Account always visible
    if (loading) return true;               // Still fetching — show all
    if (!role) return false;               // Fetch done, no role → hide gated tabs
    return hasPermission(role, tab.permission);
  });

  // If active tab got hidden after role loaded, fall back to account
  const resolvedTab: TabId =
    visibleTabs.some((t) => t.id === activeTab) ? activeTab : "account";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account, organization, and team preferences.
          </p>
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className="w-52 shrink-0">
            <nav className="space-y-0.5">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = resolvedTab === tab.id;
                // Disable permission-gated tabs while role is still loading
                const isDisabled = loading && !!tab.permission;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : isDisabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-gray-700" : isDisabled ? "text-gray-300" : "text-gray-400"
                      }`}
                    />
                    {tab.label}
                    {isDisabled && (
                      <span className="ml-auto w-3 h-3 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Role badge */}
            {!loading && role && (
              <div className="mt-4 px-3 py-2.5 rounded-md bg-white border border-gray-200">
                <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
                <p className="text-xs font-semibold text-gray-800 capitalize">{role}</p>
              </div>
            )}

            {loading && (
              <div className="mt-4 px-3 py-2.5 rounded-md bg-white border border-gray-200 animate-pulse">
                <div className="h-2.5 w-14 bg-gray-100 rounded mb-1.5" />
                <div className="h-2.5 w-10 bg-gray-100 rounded" />
              </div>
            )}
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">
            {resolvedTab === "account"      && <AccountSettings />}
            {resolvedTab === "organization" && <OrgSettings />}
            {resolvedTab === "team"         && <TeamSettings />}
            {resolvedTab === "permissions"  && <PermissionsSettings />}
            {resolvedTab === "billing"      && <BillingSettings />}
          </main>

        </div>
      </div>
    </div>
  );
}
