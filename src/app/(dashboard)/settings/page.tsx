"use client";

import { useState, useEffect } from "react";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import AccountSettings from "@/components/settings/AccountSettings";
import OrgSettings from "@/components/settings/OrgSettings";
import TeamSettings from "@/components/settings/TeamSettings";
import BillingSettings from "@/components/settings/BillingSettings";

const TABS = [
  { label: "Account", component: AccountSettings },
  { label: "Organization", component: OrgSettings, permission: "settings.edit_org" },
  { label: "Team", component: TeamSettings, permission: "settings.edit_team" },
  { label: "Billing", component: BillingSettings, permission: "settings.edit_billing" },
];

export default function SettingsPage() {
  const { role, loading } = useRole();  // custom hook fetching role from Supabase
  const [activeTab, setActiveTab] = useState("Account");

  // Debug: show role & loading
  useEffect(() => {
    console.log("ROLE:", role, "LOADING:", loading);
  }, [role, loading]);

  // Filter tabs based on permission, but show all while loading
  const visibleTabs = TABS.filter((tab) => {
    if (!tab.permission) return true;
    if (loading || !role) return true; // <-- fix: show tabs while role loading
    return hasPermission(role, tab.permission as any);
  });

  const ActiveComponent = visibleTabs.find(tab => tab.label === activeTab)?.component || AccountSettings;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Tabs sidebar */}
      <div className="w-full md:w-64 border-r border-gray-200">
        <ul className="flex md:flex-col overflow-x-auto md:overflow-x-visible">
          {visibleTabs.map((tab) => (
            <li key={tab.label}>
              <button
                className={`p-4 w-full text-left ${
                  activeTab === tab.label ? "bg-gray-100 font-semibold" : ""
                }`}
                onClick={() => setActiveTab(tab.label)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}