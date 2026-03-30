"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOrgStore, type OrgData } from "@/store/orgStore";
import { useRole } from "@/hooks/useRole";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Palette,
  CheckCircle2,
  Copy,
  Zap,
  Loader2,
  MapPin,
  ExternalLink
} from "lucide-react";
import {
  Section,
  Field,
  inputCls,
  SettingsSkeleton,
} from "./AccountSettings";
import { Button } from "@/components/ui/button";

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
  const { orgId, getToken } = useAuth();
  const { currentOrg, setCurrentOrg } = useOrgStore();
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
  }, [orgId]);

  async function fetchOrg() {
    setLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      const supabase = getSupabaseBrowserClient(token ?? undefined);

      const { data, error } = await (supabase as any)
        .from("organizations")
        .select("name, country, property_type")
        .eq("id", orgId!)
        .maybeSingle();

      if (!error && data) {
        setName(data.name ?? "");
        setCountry(data.country ?? "");
        const pt = data.property_type;
        setPropertyType(
          pt === "residential" || pt === "commercial" ? pt : "residential"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const token = await getToken({ template: "supabase" });
      const supabase = getSupabaseBrowserClient(token ?? undefined);

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
        plan_type: currentOrg?.plan_type ?? null,
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
    <div className="space-y-6 pb-10">
      {/* ── Header Card ── */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Building2 className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Building2 className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{name || "Organization"}</h2>
              <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5" />
                {country || "No country set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-400 text-[10px] font-bold uppercase tracking-wider">
              {currentOrg?.plan_type || "Free Plan"}
            </div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
              {propertyType} focus
            </div>
          </div>
        </div>
      </div>

      {/* ── Basic info ── */}
      <Section
        title="Organization Details"
        description="Core identity and location of your property management firm."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organization Name">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                className={`${inputCls} pl-10 h-11 rounded-xl ${!canEdit ? "bg-slate-50 text-slate-400" : ""}`}
              />
            </div>
          </Field>
          <Field label="Headquarters Country">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Cameroon"
                disabled={!canEdit}
                className={`${inputCls} pl-10 h-11 rounded-xl ${!canEdit ? "bg-slate-50 text-slate-400" : ""}`}
              />
            </div>
          </Field>
        </div>
        {canEdit && (
          <div className="pt-6 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-8 font-bold shadow-md transition-all active:scale-95 gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Details
            </Button>
          </div>
        )}
      </Section>

      {/* ── Property type ── */}
      <Section
        title="Portfolio Configuration"
        description="Switching this affects available modules, fields, and reporting dashboards across the system."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROPERTY_TYPES.map((type) => {
            const selected = propertyType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => canEdit && setPropertyType(type.value)}
                disabled={!canEdit}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02]"
                    : canEdit
                    ? "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                    : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm uppercase tracking-wider">{type.label}</p>
                  {selected && <CheckCircle2 className="w-5 h-5 text-teal-400" />}
                </div>
                <p className={`text-xs leading-relaxed ${selected ? "text-slate-400" : "text-slate-500"}`}>
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>

        {canEdit && (
          <div className="pt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="outline"
              className="rounded-xl h-10 px-8 font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95 gap-2"
            >
              Confirm Configuration Change
            </Button>
          </div>
        )}
      </Section>

      {/* ── Branding ── */}
      <Section
        title="Custom Branding"
        description="Personalize your tenant app and invoice templates with your logo and colors."
      >
        <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3">
            <Palette className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">White-label Experience</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Upload your logo and set your brand primary color to provide a seamless experience for your tenants.
          </p>
          <Button disabled variant="outline" className="rounded-xl border-slate-200 bg-white gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Upgrade to Enterprise
          </Button>
        </div>
      </Section>

      {/* ── Org ID ── */}
      <Section
        title="Developer API & Integration"
        description="Use your organization ID to connect with third-party tools or use the TenantFlow API."
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-600 flex items-center justify-between">
            <span className="truncate">{orgId}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(orgId ?? "");
                toast.success("ID copied to clipboard");
              }}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors shrink-0"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <Button variant="ghost" className="rounded-xl text-xs gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50">
            API Documentation
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </Section>
    </div>
  );
}

