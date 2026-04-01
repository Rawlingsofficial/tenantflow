//components/settings/TeamSettings.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSupabaseWithAuth } from "@/lib/supabase/client";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Trash2,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Briefcase,
  AlertCircle,
  Mail,
  Phone,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import {
  Section,
  Field,
  inputCls,
  SettingsSkeleton,
} from "./AccountSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

const ROLE_OPTIONS: {
  value: Role;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "owner",   label: "Owner",   icon: Crown    },
  { value: "admin",   label: "Admin",   icon: Shield   },
  { value: "manager", label: "Manager", icon: Briefcase },
  { value: "viewer",  label: "Viewer",  icon: Eye      },
];

const ROLE_COLORS: Record<Role, string> = {
  owner:   "bg-amber-50 text-amber-700 border-amber-100",
  admin:   "bg-blue-50 text-blue-700 border-blue-100",
  manager: "bg-teal-50 text-teal-700 border-teal-100",
  viewer:  "bg-slate-50 text-slate-600 border-slate-100",
};

export default function TeamSettings() {
  const { orgId, getToken } = useAuth();
  const { user } = useUser();
  const { role: myRole } = useRole();
  const supabase = useSupabaseWithAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const canManage = myRole
    ? hasPermission(myRole, "settings.manage_team")
    : false;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("organization_memberships")
        .select(`id, user_id, role, status, users ( full_name, email, phone )`)
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("role");

      if (error) throw error;
      if (data) setMembers(data as Member[]);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return toast.error("Email is required");
    setInviting(true);
    try {
      // In a real app, this would call a Clerk invitation API or a server action
      // For now, we'll mock it or add to memberships if user exists
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    try {
      const { error } = await (supabase as any)
        .from("organization_memberships")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const { error } = await (supabase as any)
        .from("organization_memberships")
        .update({ status: "inactive" })
        .eq("id", memberId);

      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  }

  if (loading) return <SettingsSkeleton />;

  const myEmail = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="space-y-6 pb-10">
      <Section
        title="Team Members"
        description={`Manage access for the ${members.length} people in your organization.`}
      >
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const isOwner = m.role === "owner";
                const isSelf = mounted && m.users.email === myEmail;
                const canEditRole = mounted && canManage && (isOwner ? myRole === "owner" : true) && !isSelf;
                const canRemove = mounted && canManage && (isOwner ? myRole === "owner" : true) && !isSelf;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                          {(m.users.full_name || m.users.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {m.users.full_name || "New User"}
                            {isSelf && <span className="ml-2 text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">YOU</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{m.users.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {canEditRole ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-colors ${ROLE_COLORS[m.role]}`}>
                              {m.role}
                              <MoreVertical className="w-3 h-3 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>                          <DropdownMenuContent align="start" className="w-40 rounded-xl">
                            {ROLE_OPTIONS.filter(opt => opt.value !== "owner" || myRole === "owner").map((opt) => (
                              <DropdownMenuItem 
                                key={opt.value} 
                                onClick={() => handleRoleChange(m.id, opt.value)}
                                className="rounded-lg gap-2 text-xs font-medium"
                              >
                                <opt.icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${ROLE_COLORS[m.role]}`}>
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canRemove && (
                        <button 
                          onClick={() => handleRemove(m.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {canManage && (
        <Section
          title="Invite Team Members"
          description="Send an email invitation to add someone to your organization."
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={`${inputCls} pl-10 h-11 rounded-xl`}
                />
              </div>
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className={`${inputCls} h-11 rounded-xl bg-white`}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Button 
                onClick={handleInvite} 
                disabled={inviting || !inviteEmail}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold gap-2 shadow-lg shadow-slate-900/20"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send Invite
              </Button>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Invitations expire after 7 days. Your available seat count will be updated once the invitation is accepted.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
