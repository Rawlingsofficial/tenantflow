// src/hooks/usePropertyType.ts
'use client';

import { useOrgStore } from "@/store/orgStore";
import {
  isFeatureAllowedForPropertyType,
  getAllowedReportSections,
} from "@/lib/permissions";

export type PropertyType = "residential" | "commercial";

/**
 * usePropertyType hook
 * Returns the current organization's property type and related helpers.
 * Relies on OrganizationProvider for store hydration.
 */
export function usePropertyType(): {
  propertyType: PropertyType;
  loading: boolean;
  isResidential: boolean;
  isCommercial: boolean;
  canView: (feature: PropertyType) => boolean;
  allowedSections: PropertyType[];
} {
  const currentOrg = useOrgStore((s) => s.currentOrg);
  
  // If we have an org ID but the store isn't populated yet, we're loading
  const loading = !currentOrg;

  // Default to residential if not loaded or not set
  const propertyType: PropertyType =
    currentOrg?.property_type === "commercial" ? "commercial" : "residential";

  function canView(feature: PropertyType): boolean {
    return isFeatureAllowedForPropertyType(propertyType, feature);
  }

  return {
    propertyType,
    loading,
    isResidential: propertyType === "residential",
    isCommercial: propertyType === "commercial",
    canView,
    allowedSections: getAllowedReportSections(propertyType) as PropertyType[],
  };
}
