"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import { useOrgStore, type OrgData } from "@/store/orgStore";
import { toast } from "sonner";
import { Section, Field, SaveButton, inputCls, SettingsSkeleton } from "./AccountSettings";

const PROPERTY_TYPES = [
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
  {
    value: "mixed",
    label: "Mixed Use",
    description: "Both residential and commercial properties.",
  },
];

export default function OrgSettings() {
  const { orgId } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const { setCurrentOrg } = useOrgStore();

  const { role, loading: roleLoading } = useRole();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState<string>("residential");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Access Control ---
  if (!roleLoading && (!role || !hasPermission(role, "settings.edit_org"))) {
    return (
      <div className="text-red-500 font-medium p-6">
        You do not have permission to access organization settings.
      </div>
    );
  }

  useEffect(() => {
    if (!orgId) return;
    fetchOrg();
  }, [orgId]);

  async function fetchOrg() {
    setLoading(true);
    const result = await (supabase as any)
      .from("organizations")
      .select("name, country, property_type")
      .eq("id", orgId!)
      .single() as {
        data: { name: string; country: string | null; property_type: string | null } | null;
        error: any;
      };

    if (result.data) {
      setName(result.data.name ?? "");
      setCountry(result.data.country ?? "");
      setPropertyType(result.data.property_type ?? "residential");
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const result = await (supabase as any)
        .from("organizations")
        .update({ name, country, property_type: propertyType })
        .eq("id", orgId) as { error: { message: string } | null };

      if (result.error) throw new Error(result.error.message);

      const updated: OrgData = {
        id: orgId,
        name,
        country,
        property_type: propertyType as OrgData["property_type"],
        plan_type: null,
      };
      setCurrentOrg(updated);
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
      <Section title="Organization Details" description="Basic information about your organization.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="pt-4 flex justify-end">
          <SaveButton onClick={handleSave} loading={saving} />
        </div>
      </Section>

      <Section
        title="Property Type"
        description="Determines which features and reports are available across the app. Changing this affects all team members."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PROPERTY_TYPES.map((type) => {
            const selected = propertyType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setPropertyType(type.value)}
                className={`relative text-left rounded-lg border p-4 transition-all ${
                  selected
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <p className="font-medium text-sm">{type.label}</p>
                <p className={`text-xs mt-1 ${selected ? "text-gray-300" : "text-gray-400"}`}>
                  {type.description}
                </p>
                {selected && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {propertyType === "mixed" && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-800 font-medium">
              Mixed mode is enabled — your team can access both residential and commercial features simultaneously.
            </p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <SaveButton onClick={handleSave} loading={saving} label="Save property type" />
        </div>
      </Section>

      <Section title="Organization ID" description="Use this ID when integrating with external systems.">
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

