"use client";

import * as React from "react";
import { useRole } from "@/hooks/useRole";
import { hasPermission, ROLE_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { Check, Minus, Info, ShieldAlert, Zap } from "lucide-react";
import { Section, SettingsSkeleton } from "./AccountSettings";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types";
import type { Permission } from "@/lib/permissions";

const ROLES: Role[] = ["owner", "admin", "manager", "viewer"];

const ROLE_COLORS: Record<Role, { header: string; check: string; bg: string }> = {
  owner:   { header: "text-amber-600",  check: "text-amber-500",  bg: "bg-amber-50"  },
  admin:   { header: "text-blue-600",   check: "text-blue-500",   bg: "bg-blue-50"   },
  manager: { header: "text-green-600",  check: "text-green-500",  bg: "bg-green-50"  },
  viewer:  { header: "text-gray-500",   check: "text-gray-400",   bg: "bg-gray-50"   },
};

const ROLE_DESC: Record<Role, string> = {
  owner: "Complete control. Manage billing and delete organization.",
  admin: "Full management. Add team members and edit all settings.",
  manager: "Day-to-day operations. Manage tenants, leases and payments.",
  viewer: "Read-only access. View reports and data without editing.",
};

export default function PermissionsSettings() {
  const { role: myRole, loading } = useRole();

  if (loading) return <SettingsSkeleton />;

  const canManage = myRole
    ? hasPermission(myRole, "settings.manage_permissions")
    : false;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Summary ── */}
      <Section
        title="Role Overview"
        description="Understanding what each team member can access."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map((r) => (
            <div key={r} className={`p-4 rounded-2xl border border-slate-200 ${ROLE_COLORS[r].bg} relative overflow-hidden`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <p className={`text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[r].header}`}>{r}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{ROLE_DESC[r]}</p>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-5">
                <ShieldAlert className="w-12 h-12" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Role × Permission matrix ── */}
      <Section
        title="Granular Permissions"
        description="A detailed breakdown of capabilities across roles."
      >
        {!canManage && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">
              You are viewing the default permission matrix. Custom roles are available on Enterprise plans.
            </p>
          </div>
        )}

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse" aria-label="Role Permission Matrix">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-6 pr-4 min-w-[240px]">
                    System Capability
                  </th>
                  {ROLES.map((r) => (
                    <th
                      key={r}
                      scope="col"
                      className={`text-center text-[10px] font-bold py-4 px-4 capitalize tracking-widest ${ROLE_COLORS[r].header}`}
                    >
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {PERMISSION_GROUPS.map((group) => (
                  <React.Fragment key={group.label}>
                    {/* Group heading row */}
                    <tr className="bg-slate-50/50">
                      <td
                        colSpan={ROLES.length + 1}
                        className="pl-6 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-y border-slate-100"
                      >
                        {group.label}
                      </td>
                    </tr>

                    {/* Permission rows */}
                    {group.permissions.map((perm) => (
                      <tr
                        key={perm.key}
                        className="hover:bg-slate-50/30 transition-colors"
                      >
                        <td className="pl-6 pr-4 py-3 text-sm text-slate-700 font-medium">
                          {perm.label}
                        </td>
                        {ROLES.map((r) => {
                          const allowed = ROLE_PERMISSIONS[r].includes(
                            perm.key as Permission
                          );
                          return (
                            <td key={r} className="text-center px-4 py-3">
                              {allowed ? (
                                <div className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center ${ROLE_COLORS[r].bg}`}>
                                  <Check
                                    className={`w-3.5 h-3.5 ${ROLE_COLORS[r].check}`}
                                    strokeWidth={3}
                                    aria-label="Allowed"
                                  />
                                </div>
                              ) : (
                                <Minus
                                  className="w-4 h-4 mx-auto text-slate-200"
                                  aria-label="Not allowed"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── Enterprise Customization ── */}
      <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Enterprise Feature</p>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Custom Roles & Permissions</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Need more specific roles like "Maintenance Tech" or "External Accountant"? 
              Enterprise customers can define unlimited custom roles with precise permission sets.
            </p>
          </div>
          <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl px-8 h-12 font-bold whitespace-nowrap">
            Upgrade to Enterprise
          </Button>
        </div>
      </div>
    </div>
  );
}
