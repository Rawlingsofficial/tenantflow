"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore, type OrgData } from "@/store/orgStore";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Section,
  Field,
  SaveButton,
  inputCls,
  SettingsSkeleton,
} from "./AccountSettings";

// ── Property type options — NO mixed ──────────────────────────────────────────
const PROPERTY_TYPES: {
  value: "residential" | "commercial";
  label: string;
  description: string;
}[] = [
  {
    value: "residential",
    label: "Residential",
    description: "Apartments, houses, and other residential properties.",
  },
  {
    value: "commercial",
    label: "Commercial",
    description: "Offices, retail spaces, and commercial buildings.",
  },
];

export default function OrgSettings() {
  const { orgId } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const { setCurrentOrg } = useOrgStore();
  const { role, loading: roleLoading } = useRole();

  const canEdit = role ? hasPermission(role, "settings.edit_org") : false;

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState<
    "residential" | "commercial"
  >("residential");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchOrg();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOrg() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("organizations")
      .select("name, country, property_type")
      .eq("id", orgId!)
      .maybeSingle();

    if (!error && data) {
      setName(data.name ?? "");
      setCountry(data.country ?? "");
      // Guard against legacy "mixed" data in DB — fall back to residential
      const pt = data.property_type;
      setPropertyType(
        pt === "residential" || pt === "commercial" ? pt : "residential"
      );
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("organizations")
        .update({ name, country, property_type: propertyType })
        .eq("id", orgId);

      if (error) throw new Error(error.message);

      setCurrentOrg({
        id: orgId,
        name,
        country,
        property_type: propertyType,
        plan_type: null,
      } as OrgData);

      toast.success("Organization updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  if (loading || roleLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">

      {/* ── Basic info ── */}
      <Section
        title="Organization Details"
        description="Basic information about your organization."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              className={`${inputCls} ${!canEdit ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              disabled={!canEdit}
              className={`${inputCls} ${!canEdit ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
            />
          </Field>
        </div>
        {canEdit && (
          <div className="pt-4 flex justify-end">
            <SaveButton onClick={handleSave} loading={saving} />
          </div>
        )}
      </Section>

      {/* ── Property type ── */}
      <Section
        title="Property Type"
        description="Determines which features and reports are available. This affects all team members."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROPERTY_TYPES.map((type) => {
            const selected = propertyType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => canEdit && setPropertyType(type.value)}
                disabled={!canEdit}
                className={`relative text-left rounded-lg border p-4 transition-all ${
                  selected
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : canEdit
                    ? "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                }`}
              >
                <p className="font-medium text-sm">{type.label}</p>
                <p
                  className={`text-xs mt-1 ${
                    selected ? "text-gray-300" : "text-gray-400"
                  }`}
                >
                  {type.description}
                </p>
                {selected && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {canEdit && (
          <div className="pt-4 flex justify-end">
            <SaveButton
              onClick={handleSave}
              loading={saving}
              label="Save property type"
            />
          </div>
        )}
      </Section>

      {/* ── Org ID ── */}
      <Section
        title="Organization ID"
        description="Use this ID when integrating with external systems."
      >
        <div className="flex items-center gap-3">
          <code className="flex-1 px-3 py-2 text-xs rounded-md bg-gray-50 border border-gray-200 text-gray-600 font-mono truncate">
            {orgId}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(orgId ?? "");
              toast.success("Copied to clipboard");
            }}
            className="px-3 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
          >
            Copy
          </button>
        </div>
      </Section>
    </div>
  );
}
