"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";
import { UnitHistoryDialog } from "@/components/buildings/UnitHistoryDialog";
import { EditBuildingDialog } from "@/components/buildings/EditBuildingDialog";
import { EditUnitDialog } from "@/components/buildings/EditUnitDialog";
import { Button } from "@/components/ui/button";
import { usePropertyType } from "@/hooks/usePropertyType";
import { ArrowLeft, Plus, Briefcase, Home } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type UnitView = "all" | "occupied" | "vacant" | "unavailable";

interface Building {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
  building_type?: string;
}

interface Unit {
  id: string;
  unit_code: string;
  unit_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  default_rent: number | null;
  status: string;
  building_id: string;
  area_sqm?: number | null;
  unit_purpose?: string | null;
  activeLease?: {
    id: string;
    tenant_id: string;
    lease_start: string;
    lease_end: string | null;
    rent_amount: number;
    status: string;
    tenant: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      primary_phone: string | null;
      photo_url: string | null;
    } | null;
  };
}

// ── Segment badge ──────────────────────────────────────────────
function SegmentBadge({ buildingType }: { buildingType: string }) {
  return buildingType === "commercial" ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wide">
      <Briefcase className="h-2.5 w-2.5" /> Commercial
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-600 border border-teal-200 uppercase tracking-wide">
      <Home className="h-2.5 w-2.5" /> Residential
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId } = useAuth();
  const supabase = createBrowserClient();
  const { propertyType } = usePropertyType();

  const isResidential = propertyType === "residential";
  const isCommercial = propertyType === "commercial";

  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitView, setUnitView] = useState<UnitView>("all");
  const [search, setSearch] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editBuildingOpen, setEditBuildingOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "overview" | "settings">("units");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: bData } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();
      setBuilding(bData || null);

      const { data: uData } = await supabase
        .from("units")
        .select(
          "id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id, area_sqm, unit_purpose"
        )
        .eq("building_id", id)
        .order("unit_code");

      setUnits(uData || []);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading) return <div>Loading building...</div>;
  if (!building) return <div>Building not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <button onClick={() => router.push("/buildings")}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1>{building.name}</h1>
        <Button onClick={() => setAddUnitOpen(true)}>
          <Plus /> Add Unit
        </Button>
      </div>

      {/* Segment badge */}
      <SegmentBadge buildingType={propertyType ?? "residential"} />

      {/* Render Tabs, Units, Overview, Settings here */}
      {/* Add dialogs: AddUnitDialog, EditUnitDialog, EditBuildingDialog, UnitHistoryDialog */}
    </div>
  );
}

