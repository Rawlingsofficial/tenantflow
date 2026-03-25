"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore, type PropertyType, type OrgData } from "@/store/orgStore";
import {
  isFeatureAllowedForPropertyType,
  getAllowedReportSections,
} from "@/lib/permissions";

interface OrgRow {
  id: string;
  name: string;
  property_type: string | null;
  country: string | null;
  plan_type: string | null;
}

interface UserRow {
  id: string;
}

interface MembershipRow {
  role: string;
}

/**
 * Fetches the current org's property type + user role and keeps orgStore in sync.
 * Returns the original { propertyType, loading } shape PLUS convenience helpers.
 */
export function usePropertyType(): {
  propertyType: PropertyType | null;
  loading: boolean;
  isResidential: boolean;
  isCommercial: boolean;
  
  canView: (feature: "residential" | "commercial") => boolean;
  allowedSections: ("residential" | "commercial")[];
} {
  const { orgId, userId } = useAuth();
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const setUserRole = useOrgStore((s) => s.setUserRole);

  const loading = !currentOrg && !!orgId;

  useEffect(() => {
    if (!orgId) return;
    if (currentOrg?.id === orgId) return;

    const supabase = getSupabaseBrowserClient();

    const loadData = async () => {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, property_type, country, plan_type")
          .eq("id", orgId)
          .single();

        if (orgError) throw orgError;
        if (!orgData) return;

        const row = orgData as OrgRow;
        const org: OrgData = {
          id: row.id,
          name: row.name,
          property_type: (row.property_type as PropertyType) ?? "residential",
          country: row.country ?? null,
          plan_type: row.plan_type ?? null,
        };
        setCurrentOrg(org);

        if (userId) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_user_id", userId)
            .single<UserRow>();

          if (userError) throw userError;
          if (userData) {
            const { data: membershipData, error: membershipError } = await supabase
              .from("organization_memberships")
              .select("role")
              .eq("organization_id", orgId)
              .eq("user_id", userData.id)
              .single<MembershipRow>();

            if (membershipError) throw membershipError;
            if (membershipData) {
              setUserRole(
                membershipData.role as "owner" | "admin" | "manager" | "viewer"
              );
            }
          }
        }
      } catch (error) {
        console.error("Error loading organization or membership:", error);
      }
    };

    loadData();
  }, [orgId, userId, currentOrg?.id, setCurrentOrg, setUserRole]);

  const propertyType = (currentOrg?.property_type ?? null) as PropertyType | null;

  function canView(feature: "residential" | "commercial"): boolean {
    return isFeatureAllowedForPropertyType(propertyType, feature);
  }

  return {
    propertyType,
    loading,
    isResidential: propertyType === "residential",
    isCommercial: propertyType === "commercial",
    canView,
    allowedSections: getAllowedReportSections(propertyType),
  };
}

