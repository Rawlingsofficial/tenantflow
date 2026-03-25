"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { Trash2, UserPlus, Crown, Shield, Eye, Briefcase } from "lucide-react";
import { Section, Field, SaveButton, inputCls, SettingsSkeleton } from "./AccountSettings";
import type { Role } from "@/types";

type Member = {
  id: string;
  user_id: string;
  role: Role;
  status: string;
  users: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
};

const ROLE_OPTIONS: { value: Role; label: string; icon: React.ElementType }[] = [
  { value: "owner", label: "Owner", icon: Crown },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "manager", label: "Manager", icon: Briefcase },
  { value: "viewer", label: "Viewer", icon: Eye },
];

const ROLE_COLORS: Record<Role, string> = {
  owner: "bg-amber-100 text-amber-800",
  admin: "bg-blue-100 text-blue-800",
  manager: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-600",
};

export default function TeamSettings() {
  const { orgId, userId } = useAuth();
  const supabase = createBrowserClient();
  const { role: myRole } = useRole();

  const canManage = myRole ? hasPermission(myRole, "settings.manage_team") : false;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(`
        id,
        user_id,
        role,
        status,
        users (
          full_name,
          email,
          phone
        )
      `)
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("role");

    if (!error && data) setMembers(data as any);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite() {
    if (!orgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      // 1. Upsert the user record
      const { data: userData, error: upsertErr } = await supabase
        .from("users")
        .upsert(
          { email: inviteEmail.trim(), full_name: inviteFullName.trim() || null },
          { onConflict: "email" }
        )
        .select("id")
        .single<{ id: string }>();

      if (upsertErr || !userData) throw upsertErr ?? new Error("Failed to create user");

      // 2. Insert membership (ignore duplicate)
      const { error: memberErr } = await supabase
        .from("organization_memberships")
        .insert({
          user_id: userData.id,
          organization_id: orgId,
          role: inviteRole,
          status: "active",
        } as any);

      if (memberErr && !memberErr.message.includes("duplicate")) throw memberErr;

      toast.success(`${inviteEmail} added as ${inviteRole}`);
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole("viewer");
      fetchMembers();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    const { error } = await supabase
      .from("organization_memberships")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    const { error } = await supabase
      .from("organization_memberships")
      .update({ status: "inactive" })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      fetchMembers();
    }
  }

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      {/* Member list */}
      <Section
        title="Team Members"
        description={`${members.length} active member${members.length !== 1 ? "s" : ""} in this organization.`}
      >
        <div className="divide-y divide-gray-100">
          {members.map((m) => {
            const isSelf = m.user_id === userId;
            const isOwner = m.role === "owner";
            const canEdit = canManage && !isSelf && !isOwner;

            return (
              <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                  {(m.users?.full_name ?? m.users?.email ?? "?")[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.users?.full_name ?? m.users?.email}
                    {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.users?.email}</p>
                </div>

                {/* Role badge / selector */}
                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                    className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    {ROLE_OPTIONS.filter((r) => r.value !== "owner").map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[m.role]}`}
                  >
                    {m.role}
                  </span>
                )}

                {/* Remove */}
                {canEdit && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Invite new member */}
      {canManage && (
        <Section
          title="Add Team Member"
          description="Add someone by email. They will be able to log in with that email via Clerk."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <input
                type="text"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="Jane Smith"
                className={inputCls}
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@company.com"
                className={inputCls}
              />
            </Field>
            <Field label="Role">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className={inputCls}
              >
                {ROLE_OPTIONS.filter((r) => r.value !== "owner").map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <RoleHint role={inviteRole} />
            </Field>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {inviting ? "Adding…" : "Add member"}
            </button>
          </div>
        </Section>
      )}

      {/* Role reference */}
      <Section title="Role Reference" description="What each role can do in the organization.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <div key={value} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[value]}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {ROLE_DESCRIPTIONS[value]}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access to everything including billing and destructive actions. Cannot be changed.",
  admin: "Full access except billing management. Can manage team members and permissions.",
  manager: "Can manage tenants, units, leases, and payments. Cannot access billing or team settings.",
  viewer: "Read-only access to all data. Cannot create, edit, or delete anything.",
};

function RoleHint({ role }: { role: Role }) {
  return (
    <p className="mt-1 text-xs text-gray-400">{ROLE_DESCRIPTIONS[role]}</p>
  );
}
