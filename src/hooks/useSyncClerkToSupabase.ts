"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useSyncClerkToSupabase() {
  const { userId, orgId, getToken } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();

  const syncedUserRef = useRef<string | null>(null);
  const syncedMemberRef = useRef<string | null>(null);

  // Sync user
  useEffect(() => {
    if (!userId || !user) return;
    if (syncedUserRef.current === userId) return;

    const syncUser = async () => {
      console.log("[Sync] Syncing user:", userId);
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error("[Sync] No token");
        return;
      }
      const supabase = getSupabaseBrowserClient(token);

      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) {
        console.error("[Sync] No email");
        return;
      }

      const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
      const phone = user.primaryPhoneNumber?.phoneNumber ?? null;

      // 🔥 FIX 1: Cast the user upsert payload to 'any'
      const { data, error } = await supabase
        .from("users")
        .upsert(
          { clerk_user_id: userId, email, full_name, phone, status: "active" } as any,
          { onConflict: "clerk_user_id" }
        )
        .select();

      if (error) {
        console.error("[Sync] user upsert failed:", error);
      } else {
        console.log("[Sync] user upsert success:", data);
        syncedUserRef.current = userId;
      }
    };

    syncUser();
  }, [userId, user, getToken]);

  // Sync organization and membership
  useEffect(() => {
    if (!userId || !orgId || !organization) return;

    const memberKey = `${userId}:${orgId}`;
    if (syncedMemberRef.current === memberKey) return;

    const syncOrgAndMembership = async () => {
      console.log("[Sync] Syncing org and membership:", orgId);
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error("[Sync] No token");
        return;
      }
      const supabase = getSupabaseBrowserClient(token);

      try {
        const orgName = organization.name ?? "Unnamed Org";

        // 1. Ensure org row exists
        // 🔥 FIX 2: Cast the org upsert payload to 'any'
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .upsert(
            { id: orgId, name: orgName, plan_type: "free", status: "active" } as any,
            { onConflict: "id", ignoreDuplicates: true }
          )
          .select();
        if (orgError) {
          console.error("[Sync] org upsert failed:", orgError);
          return;
        }
        console.log("[Sync] org upsert success:", orgData);

        // 2. Get internal user UUID
        // 🔥 FIX 3: Explicitly type the user select so 'userData.id' works below
        const { data: userData, error: userError } = (await supabase
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId)
          .maybeSingle()) as { data: { id: string } | null; error: any };

        if (userError || !userData) {
          console.error("[Sync] user not found for clerk_user_id:", userId);
          return;
        }
        console.log("[Sync] found user internal id:", userData.id);

        // 3. Check existing memberships
        // 🔥 FIX 4: Explicitly type the membership select so 'm.user_id' works below
        const { data: existingMembers } = (await supabase
          .from("organization_memberships")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .eq("status", "active")) as { data: { id: string; user_id: string; role: string }[] | null };

        const alreadyMember = (existingMembers ?? []).some(
          (m) => m.user_id === userData.id
        );
        if (alreadyMember) {
          console.log("[Sync] membership already exists");
          syncedMemberRef.current = memberKey;
          return;
        }

        const isFirst = !existingMembers || existingMembers.length === 0;
        const role = isFirst ? "owner" : normalizeClerkRole(membership?.role);
        console.log("[Sync] inserting membership with role:", role);

        // 🔥 FIX 5: Cast the membership insert payload to 'any'
        const { error: insertErr } = await supabase
          .from("organization_memberships")
          .insert({
            user_id: userData.id,
            organization_id: orgId,
            role,
            status: "active",
          } as any);

        if (insertErr && !insertErr.message?.includes("duplicate")) {
          console.error("[Sync] membership insert failed:", insertErr);
        } else {
          console.log("[Sync] membership insert success");
          syncedMemberRef.current = memberKey;
        }
      } catch (err) {
        console.error("[Sync] syncOrgAndMembership error:", err);
      }
    };

    syncOrgAndMembership();
  }, [userId, orgId, organization?.id, membership, getToken]);
}

function normalizeClerkRole(clerkRole: string | undefined | null): "owner" | "admin" | "manager" | "viewer" {
  if (!clerkRole) return "viewer";
  if (clerkRole === "org:admin" || clerkRole === "admin") return "admin";
  if (clerkRole === "org:member" || clerkRole === "basic_member") return "manager";
  return "viewer";
}

