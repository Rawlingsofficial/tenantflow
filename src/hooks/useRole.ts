"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/store/orgStore";
import type { Role } from "@/types";

export function useRole() {
  const { userId, orgId } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const currentOrg = useOrgStore((s) => s.currentOrg);
  const userRole = useOrgStore((s) => s.userRole);
  const setUserRole = useOrgStore((s) => s.setUserRole);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[useRole] userId:", userId);
    console.log("[useRole] orgId:", orgId);
    console.log("[useRole] currentOrg in store:", currentOrg);
    console.log("[useRole] userRole in store:", userRole);

    if (!userId || !orgId) {
      console.log("[useRole] Missing userId or orgId, setting role to null");
      setUserRole(null);
      setLoading(false);
      return;
    }

    // If role already loaded for this org, skip fetching
    if (userRole && currentOrg?.id === orgId) {
      console.log("[useRole] Role already loaded, skipping fetch");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      console.log("[useRole] Starting fetch...");
      setLoading(true);
      try {
        // 1. Get user's Supabase UUID
        const userResult = await (supabase as any)
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId!)
          .single();

        if (userResult.error) {
          console.error("[useRole] Error fetching user:", userResult.error);
          if (!cancelled) setUserRole(null);
          return;
        }
        if (!userResult.data) {
          console.error("[useRole] No user found with clerk_user_id:", userId);
          if (!cancelled) setUserRole(null);
          return;
        }

        const supabaseUserId = userResult.data.id;
        console.log("[useRole] Found supabase user id:", supabaseUserId);

        // 2. Get membership role
        const memberResult = await (supabase as any)
          .from("organization_memberships")
          .select("role")
          .eq("user_id", supabaseUserId)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .single();

        if (memberResult.error) {
          console.error("[useRole] Error fetching membership:", memberResult.error);
          if (!cancelled) setUserRole(null);
          return;
        }

        if (memberResult.data?.role) {
          console.log("[useRole] Setting userRole to:", memberResult.data.role);
          setUserRole(memberResult.data.role);
        } else {
          console.warn("[useRole] No membership found for user:", supabaseUserId);
          if (!cancelled) setUserRole(null);
        }

        // 3. Hydrate org info if not set
        if (!currentOrg || currentOrg.id !== orgId) {
          const orgResult = await (supabase as any)
            .from("organizations")
            .select("id, name, property_type, country, plan_type")
            .eq("id", orgId!)
            .single();

          if (orgResult.error) {
            console.error("[useRole] Error fetching organization:", orgResult.error);
          } else if (orgResult.data && !cancelled) {
            console.log("[useRole] Setting currentOrg to:", orgResult.data);
            setCurrentOrg({
              id: orgResult.data.id,
              name: orgResult.data.name,
              property_type: (orgResult.data.property_type ?? "residential") as any,
              country: orgResult.data.country,
              plan_type: orgResult.data.plan_type,
            });
          }
        }
      } catch (err) {
        console.error("[useRole] Unexpected error:", err);
        if (!cancelled) setUserRole(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          console.log("[useRole] Fetch finished, loading set to false");
        }
      }
    }

    fetchRole();
    return () => {
      cancelled = true;
    };
  }, [userId, orgId, currentOrg?.id, userRole]); // added dependencies to ensure refresh if they change

  return { role: userRole, loading };
}

