"use client";

import { useEffect } from "react";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * Drop this hook inside your dashboard layout.
 * It runs on every login and ensures the user + org + membership
 * exist in Supabase — no manual SQL inserts needed.
 */
export function useSyncClerkToSupabase() {
  const { userId, orgId } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId || !user) return;
    syncUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user]);

  useEffect(() => {
    if (!orgId || !organization) return;
    syncOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, organization, membership]);

  async function syncUser() {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      const full_name = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ") || null;
      const phone = user?.primaryPhoneNumber?.phoneNumber ?? null;

      await supabase.from("users").upsert(
        {
          clerk_user_id: userId,
          email,
          full_name,
          phone,
          status: "active",
        } as any,
        { onConflict: "clerk_user_id" }
      );
    } catch (err) {
      console.error("Failed to sync user to Supabase:", err);
    }
  }

  async function syncOrg() {
    if (!orgId || !organization) return;

    try {
      // 1. Upsert organization
      await supabase.from("organizations").upsert(
        {
          id: orgId,
          name: organization.name,
          plan_type: "free",
          status: "active",
        } as any,
        { onConflict: "id" }
      );

      // 2. Get the user's Supabase UUID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", userId!)
        .returns<{ id: string }[]>()
        .single();

      if (!userData) return;

      // 3. Upsert membership
      const clerkRole = (membership?.role as string) ?? "org:member";
      const role = normalizeRole(clerkRole);

      await supabase.from("organization_memberships").upsert(
        {
          user_id: userData.id,
          organization_id: orgId,
          role,
          status: "active",
        } as any,
        { onConflict: "user_id,organization_id" }
      );
    } catch (err) {
      console.error("Failed to sync org to Supabase:", err);
    }
  }
}

function normalizeRole(clerkRole: string): "owner" | "admin" | "manager" | "viewer" {
  if (clerkRole === "org:admin") return "admin";
  if (clerkRole === "org:member") return "manager";
  if (clerkRole === "basic_member") return "manager";
  if (clerkRole === "admin") return "admin";
  return "viewer";
}
