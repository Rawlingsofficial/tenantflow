"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { AddBuildingDialog } from "@/components/buildings/AddBuildingDialog";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePropertyType } from "@/hooks/usePropertyType";
import { useMixedModeStore } from "@/store/mixedModeStore";
import {
  Search, Plus, Building2, Home, ChevronDown, ChevronUp,
  MapPin, ArrowUpRight, CheckCircle2, Wrench, Briefcase,
  Layers,
} from "lucide-react";

type UnitFilter = "all" | "occupied" | "vacant" | "maintenance";

interface BuildingWithStats {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
  building_type: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  maintenance_units: number;
  occupancy_rate: number;
}

// ── Segment badge ──────────────────────────────────────────────
function SegmentBadge({ type }: { type: string }) {
  if (type === "commercial") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wide">
        <Briefcase className="h-2.5 w-2.5" /> Comm
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-600 border border-teal-200 uppercase tracking-wide">
      <Home className="h-2.5 w-2.5" /> Resi
    </span>
  );
}

export default function BuildingsPage() {
  const { orgId } = useAuth();
  const { propertyType } = usePropertyType();
  const { mode } = useMixedModeStore();
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<BuildingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Derive which segment to show based on property type + mixed mode
  const isMixed = propertyType === "mixed";
  const activeSegment: "residential" | "commercial" =
    propertyType === "commercial"
      ? "commercial"
      : isMixed
        ? mode
        : "residential";

  useEffect(() => {
    if (!orgId) return;
    fetchBuildings();
  }, [orgId, refreshKey]);

  async function fetchBuildings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, name, address, status, photo_url, organization_id, building_type, units(id, status)")
        .eq("organization_id", orgId!)
        .order("name");

      if (error) throw error;

      const enriched: BuildingWithStats[] = ((data || []) as any[]).map((b) => {
        const units: { id: string; status: string }[] = b.units || [];
        const total = units.length;
        const occupied = units.filter((u) => u.status === "occupied").length;
        const vacant = units.filter((u) => u.status === "vacant").length;
        const maintenance = units.filter((u) => u.status === "maintenance").length;
        return {
          id: b.id, name: b.name, address: b.address, status: b.status,
          photo_url: b.photo_url, organization_id: b.organization_id,
          building_type: b.building_type ?? "residential",
          total_units: total, occupied_units: occupied,
          vacant_units: vacant, maintenance_units: maintenance,
          occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
        };
      });
      setBuildings(enriched);
    } catch (err) {
      console.error("Failed to fetch buildings:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter by segment first, then by unit filter and search
  const segmentFiltered = buildings.filter((b) => {
    if (propertyType === "residential") return b.building_type !== "commercial";
    if (propertyType === "commercial") return b.building_type === "commercial";
    // mixed: filter by active segment
    return activeSegment === "commercial"
      ? b.building_type === "commercial"
      : b.building_type !== "commercial";
  });

  const filtered = segmentFiltered.filter((b) => {
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.address || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (unitFilter === "occupied") return b.occupied_units > 0;
    if (unitFilter === "vacant") return b.vacant_units > 0;
    if (unitFilter === "maintenance") return b.maintenance_units > 0;
    return true;
  });

  const unitFilterTabs: { label: string; value: UnitFilter; count: number }[] = [
    { label: "All", value: "all", count: segmentFiltered.length },
    { label: "Has Occupied", value: "occupied", count: segmentFiltered.filter(b => b.occupied_units > 0).length },
    { label: "Has Vacant", value: "vacant", count: segmentFiltered.filter(b => b.vacant_units > 0).length },
    { label: "Maintenance", value: "maintenance", count: segmentFiltered.filter(b => b.maintenance_units > 0).length },
  ];

  // Stats for current segment
  const totalUnits = segmentFiltered.reduce((s, b) => s + b.total_units, 0);
  const totalOccupied = segmentFiltered.reduce((s, b) => s + b.occupied_units, 0);
  const portfolioOccRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  const isCommercialSegment = activeSegment === "commercial";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isCommercialSegment ? "Commercial Spaces" : "Buildings & Units"}
              </h1>
              {/* Active segment badge */}
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                isCommercialSegment
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }`}>
                {isCommercialSegment
                  ? <><Briefcase className="h-3 w-3" /> Commercial</>
                  : <><Home className="h-3 w-3" /> Residential</>
                }
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {segmentFiltered.length} propert{segmentFiltered.length !== 1 ? "ies" : "y"} · {totalUnits} units · {portfolioOccRate}% occupied
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mixed-mode segment switcher in header */}
            {isMixed && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
                {([
                  { id: "residential" as const, label: "Residential", icon: Home },
                  { id: "commercial"  as const, label: "Commercial",  icon: Briefcase },
                ] as const).map(({ id, label, icon: Icon }) => {
                  const { setMode } = useMixedModeStore.getState();
                  return (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        mode === id
                          ? id === "residential"
                            ? "bg-teal-600 text-white shadow-sm"
                            : "bg-[#1B3B6F] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search buildings…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-52 bg-white border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-teal-400/25"
              />
            </div>

            <Button
              onClick={() => setAddOpen(true)}
              className={`h-9 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 px-4 shadow-sm ${
                isCommercialSegment
                  ? "bg-[#1B3B6F] hover:bg-[#162d52]"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              <Plus className="h-4 w-4" />
              Add {isCommercialSegment ? "Property" : "Building"}
            </Button>
          </div>
        </motion.div>

        {/* Unit filter tabs */}
        <div className="flex items-center border-b border-slate-200">
          {unitFilterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setUnitFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                unitFilter === tab.value
                  ? isCommercialSegment
                    ? "border-[#1B3B6F] text-[#1B3B6F]"
                    : "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                unitFilter === tab.value
                  ? isCommercialSegment
                    ? "bg-[#1B3B6F]/10 text-[#1B3B6F]"
                    : "bg-teal-100 text-teal-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Buildings list */}
      <div className="px-6 flex-1 space-y-4 pb-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
              isCommercialSegment ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"
            }`}>
              {isCommercialSegment
                ? <Briefcase className="h-5 w-5 text-indigo-300" />
                : <Building2 className="h-5 w-5 text-slate-300" />
              }
            </div>
            <p className="text-slate-500 font-medium text-sm">
              No {isCommercialSegment ? "commercial properties" : "buildings"} found
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {search ? "Try a different search term" : `Add your first ${isCommercialSegment ? "commercial property" : "building"} to get started`}
            </p>
          </div>
        ) : (
          filtered.map((building, i) => (
            <motion.div
              key={building.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <BuildingCard
                building={building}
                isCommercialSegment={isCommercialSegment}
                isMixed={isMixed}
                onRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </motion.div>
          ))
        )}
      </div>

      <AddBuildingDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); setRefreshKey((k) => k + 1); }}
      />
    </div>
  );
}

// ─── Building Card ─────────────────────────────────────────────

function BuildingCard({
  building, isCommercialSegment, isMixed, onRefresh,
}: {
  building: BuildingWithStats;
  isCommercialSegment: boolean;
  isMixed: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const isCommercialBuilding = building.building_type === "commercial";

  const accentColor = isCommercialBuilding
    ? { bar: "bg-indigo-500", barBg: "bg-indigo-500", text: "text-indigo-600", textWeak: "text-indigo-500" }
    : { bar: "bg-teal-500", barBg: "bg-teal-500", text: "text-teal-600", textWeak: "text-teal-500" };

  const occupancyColor =
    building.occupancy_rate >= 80 ? accentColor.bar :
    building.occupancy_rate >= 50 ? "bg-amber-400" :
    "bg-red-400";

  const occupancyTextColor =
    building.occupancy_rate >= 80 ? accentColor.text :
    building.occupancy_rate >= 50 ? "text-amber-500" :
    "text-red-500";

  async function fetchUnits() {
    setLoadingUnits(true);
    const { data } = await supabase
      .from("units")
      .select(`id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, area_sqm, unit_purpose,
        leases(id, tenant_id, lease_start, lease_end, status,
          tenants(id, first_name, last_name, primary_phone))`)
      .eq("building_id", building.id)
      .order("unit_code");
    setUnits(data || []);
    setLoadingUnits(false);
  }

  function toggleUnits() {
    if (!expanded) fetchUnits();
    setExpanded((v) => !v);
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
      isCommercialBuilding ? "border-indigo-200/60" : "border-slate-200/80"
    }`}>
      <div className="p-5 flex gap-5">
        {/* Photo */}
        <div
          className="w-36 h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer border border-slate-200/60"
          onClick={() => router.push(`/buildings/${building.id}`)}
        >
          {building.photo_url ? (
            <img src={building.photo_url} alt={building.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
              isCommercialBuilding
                ? "bg-gradient-to-br from-[#1B3B6F]/5 to-indigo-500/5"
                : "bg-gradient-to-br from-[#1B3B6F]/5 to-teal-500/5"
            }`}>
              {isCommercialBuilding
                ? <Briefcase className="h-8 w-8 text-indigo-200" />
                : <Building2 className="h-8 w-8 text-slate-300" />
              }
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2
                  className={`text-base font-bold text-slate-900 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isCommercialBuilding ? "hover:text-indigo-700" : "hover:text-teal-700"
                  }`}
                  onClick={() => router.push(`/buildings/${building.id}`)}
                >
                  {building.name}
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                </h2>
                {/* Show segment badge on mixed orgs so user always knows context */}
                {isMixed && <SegmentBadge type={building.building_type} />}
              </div>
              {building.address && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {building.address}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
              building.status === "active"
                ? isCommercialBuilding
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                building.status === "active"
                  ? isCommercialBuilding ? "bg-indigo-500 animate-pulse" : "bg-teal-500 animate-pulse"
                  : "bg-slate-400"
              }`} />
              {building.status}
            </span>
          </div>

          {/* Stats chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: Home,        label: "Total",       value: building.total_units,       color: "text-slate-700",  bg: "bg-slate-50 border-slate-200" },
              { icon: CheckCircle2, label: "Occupied",   value: building.occupied_units,    color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
              { icon: Home,        label: "Vacant",      value: building.vacant_units,      color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
              { icon: Wrench,      label: "Maintenance", value: building.maintenance_units, color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
            ].map((chip) => (
              <div key={chip.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${chip.bg} ${chip.color}`}>
                <chip.icon className="h-3 w-3" />
                <span>{chip.value}</span>
                <span className="font-normal opacity-70 text-[10px]">{chip.label}</span>
              </div>
            ))}

            {/* Occupancy bar */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 ml-auto">
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${occupancyColor}`}
                  style={{ width: `${building.occupancy_rate}%` }} />
              </div>
              <span className={`text-xs font-bold tabular-nums ${occupancyTextColor}`}>
                {building.occupancy_rate}%
              </span>
            </div>

            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); setAddUnitOpen(true); }}
              className={`h-8 text-white text-xs font-semibold px-3 rounded-xl shadow-sm ${
                isCommercialBuilding
                  ? "bg-[#1B3B6F] hover:bg-[#162d52]"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add {isCommercialBuilding ? "Space" : "Unit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <div className="border-t border-slate-100">
        <button
          onClick={toggleUnits}
          className="w-full px-5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 hover:bg-slate-50/70 transition-colors"
        >
          <span className="flex-1 text-left text-slate-600">
            {isCommercialBuilding ? "Spaces" : "Units"} ({building.total_units})
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-slate-100"
            >
              {loadingUnits ? (
                <div className="px-5 py-5 text-xs text-slate-400 text-center animate-pulse">
                  Loading {isCommercialBuilding ? "spaces" : "units"}…
                </div>
              ) : (
                <UnitsMiniTable units={units} isCommercial={isCommercialBuilding} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddUnitDialog
        open={addUnitOpen}
        buildingId={building.id}
        buildingName={building.name}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => { setAddUnitOpen(false); onRefresh(); if (expanded) fetchUnits(); }}
      />
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────

function UnitStatusBadge({ status }: { status: string }) {
  if (status === "occupied") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Occupied
    </span>
  );
  if (status === "vacant") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Vacant
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Maintenance
    </span>
  );
}

// ─── Units mini table ──────────────────────────────────────────

function UnitsMiniTable({ units, isCommercial }: { units: any[]; isCommercial: boolean }) {
  const router = useRouter();

  if (units.length === 0) {
    return (
      <div className="px-5 py-6 text-sm text-slate-400 text-center">
        No {isCommercial ? "spaces" : "units"} added yet.
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50/60">
          <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isCommercial ? "Space" : "Unit"}
          </th>
          {isCommercial ? (
            <>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Purpose</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Area m²</th>
            </>
          ) : (
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bed/Bath</th>
          )}
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lease End</th>
          <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody>
        {units.map((unit) => {
          const activeLease = (unit.leases || []).find((l: any) => l.status === "active");
          const tenant = activeLease?.tenants;
          const leaseEnd = activeLease?.lease_end;
          return (
            <tr
              key={unit.id}
              className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors"
              onClick={() => router.push(`/buildings/${unit.building_id}?unit=${unit.id}`)}
            >
              <td className="px-5 py-2.5">
                <span className="font-mono font-semibold text-slate-700">{unit.unit_code}</span>
              </td>
              {isCommercial ? (
                <>
                  <td className="px-3 py-2.5 text-slate-500 capitalize">{unit.unit_purpose || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{unit.area_sqm ? `${unit.area_sqm} m²` : "—"}</td>
                </>
              ) : (
                <td className="px-3 py-2.5 text-slate-500">
                  {(unit.bedrooms ?? "—")}bd · {(unit.bathrooms ?? "—")}ba
                </td>
              )}
              <td className="px-3 py-2.5">
                {tenant ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] flex items-center justify-center text-[#14b8a6] text-[9px] font-bold shrink-0">
                      {(tenant.first_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="text-slate-700 font-medium">{tenant.first_name} {tenant.last_name}</span>
                  </div>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-slate-500">
                {leaseEnd
                  ? new Date(leaseEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-5 py-2.5"><UnitStatusBadge status={unit.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
