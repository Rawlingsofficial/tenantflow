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
      const token = await getToken();
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

      const { data, error } = await supabase
        .from("users")
        .upsert(
          { clerk_user_id: userId, email, full_name, phone, status: "active" },
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
      const token = await getToken();
      if (!token) {
        console.error("[Sync] No token");
        return;
      }
      const supabase = getSupabaseBrowserClient(token);

      try {
        const orgName = organization.name ?? "Unnamed Org";

        // 1. Ensure org row exists
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .upsert(
            { id: orgId, name: orgName, plan_type: "free", status: "active" },
            { onConflict: "id", ignoreDuplicates: true }
          )
          .select();
        if (orgError) {
          console.error("[Sync] org upsert failed:", orgError);
          return;
        }
        console.log("[Sync] org upsert success:", orgData);

        // 2. Get internal user UUID
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId)
          .maybeSingle();

        if (userError || !userData) {
          console.error("[Sync] user not found for clerk_user_id:", userId);
          return;
        }
        console.log("[Sync] found user internal id:", userData.id);

        // 3. Check existing memberships
        const { data: existingMembers } = await supabase
          .from("organization_memberships")
          .select("id, user_id, role")
          .eq("organization_id", orgId)
          .eq("status", "active");

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

        const { error: insertErr } = await supabase
          .from("organization_memberships")
          .insert({
            user_id: userData.id,
            organization_id: orgId,
            role,
            status: "active",
          });

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