"use client";

import { useEffect } from "react";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";

export function useSyncClerkToSupabase() {
  const { userId, orgId } = useAuth();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId || !user) return;
    syncUser();
  }, [userId, user]);

  useEffect(() => {
    if (!orgId || !organization || !userId) return;
    syncOrg();
  }, [orgId, organization, membership, userId]);

  async function syncUser() {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) {
        console.error("❌ No email from Clerk");
        return;
      }

      const full_name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
      const phone = user?.primaryPhoneNumber?.phoneNumber ?? null;

      const { error } = await supabase.from("users").upsert(
        {
          clerk_user_id: userId,
          email,
          full_name,
          phone,
          status: "active",
        },
        { onConflict: "clerk_user_id" }
      );

      if (error) throw error;
    } catch (err) {
      console.error("❌ Failed to sync user:", err);
    }
  }

  async function syncOrg() {
    try {
      if (!organization) return;

      const orgName = organization.name ?? "Unnamed Org";

      // 1. Ensure organization exists
      const { error: orgError } = await supabase
        .from("organizations")
        .upsert(
          {
            id: orgId,
            name: orgName,
            plan_type: "free",
            status: "active",
            property_type: null,
          },
          { onConflict: "id" }
        );

      if (orgError) throw orgError;

      // 2. Get user UUID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", userId)
        .single();

      if (userError || !userData) {
        console.error("❌ User not found");
        return;
      }

      // 3. Normalize role
      const clerkRole = membership?.role ?? "org:member";
      const role = normalizeRole(clerkRole);

      // 4. Insert membership
      const { error: memberError } = await supabase
        .from("organization_memberships")
        .insert({
          user_id: userData.id,  // ✅ Fixed type error
          organization_id: orgId,
          role,
          status: "active",
        });

      if (memberError && !memberError.message.includes("duplicate")) {
        throw memberError;
      }

      console.log("✅ Org sync complete");
    } catch (err) {
      console.error("❌ Failed to sync org:", err);
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

