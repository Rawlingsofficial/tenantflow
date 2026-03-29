//components/settings/TeamSettings.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
  Clock
} from "lucide-react";
import {
  Section,
  Field,
  inputCls,
  SettingsSkeleton,
  SaveButton
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

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner:
    "Full access to everything including billing and destructive actions. Multiple owners are allowed.",
  admin:
    "Full access except billing. Can manage team members and settings.",
  manager:
    "Can manage tenants, units, leases, and payments. No billing or team settings.",
  viewer: "Read-only access to all data.",
};

export default function TeamSettings() {
  const { orgId } = useAuth();
  const { user } = useUser();
  const supabase = getSupabaseBrowserClient();
  const { role: myRole } = useRole();

  const canManage = myRole
    ? hasPermission(myRole, "settings.manage_team")
    : false;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("organization_memberships")
        .select(
          `id, user_id, role, status, users ( full_name, email, phone )`
        )
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("role");

      if (!error && data) setMembers(data as Member[]);
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
    // ... rest of the function ...
  }

  // ... handleRoleChange and handleRemove ...

  if (loading) return <SettingsSkeleton />;

  const myEmail = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="space-y-6 pb-10">
      {/* Member list */}
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
                const isSelf = m.users.email === myEmail;

                const canEditRole = canManage && (isOwner ? myRole === "owner" : true) && !isSelf;
                const canRemove = canManage && (isOwner ? myRole === "owner" : true) && !isSelf;


