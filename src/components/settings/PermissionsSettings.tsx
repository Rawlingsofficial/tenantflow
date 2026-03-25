"use client";

import { useRole } from "@/hooks/useRole";
import { hasPermission, ROLE_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { Check, Minus } from "lucide-react";
import { Section, SettingsSkeleton } from "./AccountSettings";
import type { Role } from "@/types";
import type { Permission } from "@/lib/permissions";

const ROLES: Role[] = ["owner", "admin", "manager", "viewer"];

const ROLE_COLORS: Record<Role, { header: string; check: string }> = {
  owner:   { header: "text-amber-600",  check: "text-amber-500"  },
  admin:   { header: "text-blue-600",   check: "text-blue-500"   },
  manager: { header: "text-green-600",  check: "text-green-500"  },
  viewer:  { header: "text-gray-500",   check: "text-gray-400"   },
};

export default function PermissionsSettings() {
  const { role: myRole, loading } = useRole();

  if (loading) return <SettingsSkeleton />;

  const canManage = myRole
    ? hasPermission(myRole, "settings.manage_permissions")
    : false;

  return (
    <div className="space-y-6">

      {/* ── Role × Permission matrix ── */}
      <Section
        title="Role Permission Matrix"
        description="What each role can do. Owners can change roles in the Team tab."
      >
        {!canManage && (
          <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Read-only view. Only{" "}
              <span className="font-medium text-gray-700">owners</span> can
              modify role structures.
            </p>
          </div>
        )}

        <div className="overflow-x-auto -mx-6">
          {/*
            FIX: The original code had <tbody> nested inside <tbody> which is
            invalid HTML and breaks rendering in all browsers.
            Correct structure: thead > tr, tbody > (tr for group heading + tr per permission)
          */}
          <table className="min-w-full" aria-label="Role Permission Matrix">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 pb-3 pl-6 pr-4 w-56">
                  Permission
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    scope="col"
                    className={`text-center text-xs font-semibold pb-3 px-4 capitalize ${ROLE_COLORS[r].header}`}
                  >
                    {r}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <>
                  {/* Group heading row — uses a <tr> not a nested <tbody> */}
                  <tr key={`group-${group.label}`} className="bg-gray-50">
                    <td
                      colSpan={ROLES.length + 1}
                      className="pl-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {group.label}
                    </td>
                  </tr>

                  {/* Permission rows */}
                  {group.permissions.map((perm) => (
                    <tr
                      key={perm.key}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="pl-6 pr-4 py-2.5 text-sm text-gray-700">
                        {perm.label}
                      </td>
                      {ROLES.map((r) => {
                        const allowed = ROLE_PERMISSIONS[r].includes(
                          perm.key as Permission
                        );
                        return (
                          <td key={r} className="text-center px-4 py-2.5">
                            {allowed ? (
                              <Check
                                className={`w-4 h-4 mx-auto ${ROLE_COLORS[r].check}`}
                                strokeWidth={2.5}
                                aria-label="Allowed"
                              />
                            ) : (
                              <Minus
                                className="w-4 h-4 mx-auto text-gray-200"
                                aria-label="Not allowed"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── My permissions ── */}
      {myRole && (
        <Section
          title="Your Permissions"
          description={`You are signed in as ${myRole}. Here are the actions you can perform.`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PERMISSION_GROUPS.flatMap((g) =>
              g.permissions.map((p) => {
                const allowed = hasPermission(myRole, p.key);
                return (
                  <div
                    key={p.key}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${
                      allowed ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {allowed ? (
                      <Check
                        className="w-3.5 h-3.5 text-green-500 shrink-0"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-gray-200 shrink-0" />
                    )}
                    <span className={allowed ? "" : "line-through"}>
                      {p.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
