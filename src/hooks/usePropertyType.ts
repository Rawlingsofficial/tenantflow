"use client";

import { useOrgStore } from "@/store/orgStore";
import {
  isFeatureAllowedForPropertyType,
  getAllowedReportSections,
  type PropertyType,
} from "@/lib/permissions";

/**
 * Returns the current org's property type and helper utilities.
 *
 * Usage:
 *   const { propertyType, isResidential, isCommercial, isMixed, canView } = usePropertyType()
 *
 *   if (!canView('residential')) return null  // hides component for wrong context
 */
export function usePropertyType() {
  const { currentOrg } = useOrgStore();

  const propertyType = (currentOrg?.property_type ?? null) as PropertyType | null;

  const isResidential = propertyType === "residential";
  const isCommercial = propertyType === "commercial";
  const isMixed = propertyType === "mixed";

  /**
   * Returns true if the given feature context is allowed.
   * Always true for 'mixed', strict for 'residential' / 'commercial'.
   */
  function canView(feature: "residential" | "commercial"): boolean {
    return isFeatureAllowedForPropertyType(propertyType, feature);
  }

  const allowedSections = getAllowedReportSections(propertyType);

  return {
    propertyType,
    isResidential,
    isCommercial,
    isMixed,
    canView,
    allowedSections,
  };
}
