"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { AddBuildingDialog } from "@/components/buildings/AddBuildingDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePropertyType } from "@/hooks/usePropertyType";

import { Search, Plus, Building2, Home, MapPin, ArrowUpRight, Briefcase } from "lucide-react";

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
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<BuildingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
          id: b.id,
          name: b.name,
          address: b.address,
          status: b.status,
          photo_url: b.photo_url,
          organization_id: b.organization_id,
          building_type: b.building_type ?? "residential",
          total_units: total,
          occupied_units: occupied,
          vacant_units: vacant,
          maintenance_units: maintenance,
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

  // Only filter by propertyType and unit filter
  const filtered = buildings
    .filter((b) =>
      propertyType === "commercial" ? b.building_type === "commercial" : b.building_type !== "commercial"
    )
    .filter((b) => {
      const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.address || "").toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (unitFilter === "occupied") return b.occupied_units > 0;
      if (unitFilter === "vacant") return b.vacant_units > 0;
      if (unitFilter === "maintenance") return b.maintenance_units > 0;
      return true;
    });

  const unitFilterTabs: { label: string; value: UnitFilter; count: number }[] = [
    { label: "All", value: "all", count: filtered.length },
    { label: "Has Occupied", value: "occupied", count: filtered.filter(b => b.occupied_units > 0).length },
    { label: "Has Vacant", value: "vacant", count: filtered.filter(b => b.vacant_units > 0).length },
    { label: "Maintenance", value: "maintenance", count: filtered.filter(b => b.maintenance_units > 0).length },
  ];

  const totalUnits = filtered.reduce((s, b) => s + b.total_units, 0);
  const totalOccupied = filtered.reduce((s, b) => s + b.occupied_units, 0);
  const portfolioOccRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  const isCommercial = propertyType === "commercial";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isCommercial ? "Commercial Spaces" : "Buildings & Units"}
              </h1>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                isCommercial ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-teal-50 text-teal-700 border-teal-200"
              }`}>
                {isCommercial ? <><Briefcase className="h-3 w-3" /> Commercial</> : <><Home className="h-3 w-3" /> Residential</>}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {filtered.length} propert{filtered.length !== 1 ? "ies" : "y"} · {totalUnits} units · {portfolioOccRate}% occupied
            </p>
          </div>

          <div className="flex items-center gap-3">
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
                isCommercial ? "bg-[#1B3B6F] hover:bg-[#162d52]" : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              <Plus className="h-4 w-4" /> Add {isCommercial ? "Property" : "Building"}
            </Button>
          </div>
        </motion.div>

        {/* Unit filter tabs */}
        <div className="flex items-center border-b border-slate-200">
          {unitFilterTabs.map((tab) => (
            <button key={tab.value} onClick={() => setUnitFilter(tab.value)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              unitFilter === tab.value ? (isCommercial ? "border-[#1B3B6F] text-[#1B3B6F]" : "border-teal-600 text-teal-700") : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                unitFilter === tab.value ? (isCommercial ? "bg-[#1B3B6F]/10 text-[#1B3B6F]" : "bg-teal-100 text-teal-700") : "bg-slate-100 text-slate-500"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Buildings list */}
      <div className="px-6 flex-1 space-y-4 pb-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
              isCommercial ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"
            }`}>
              {isCommercial ? <Briefcase className="h-5 w-5 text-indigo-300" /> : <Building2 className="h-5 w-5 text-slate-300" />}
            </div>
            <p className="text-slate-500 font-medium text-sm">No {isCommercial ? "commercial properties" : "buildings"} found</p>
            <p className="text-slate-400 text-xs mt-1">{search ? "Try a different search term" : `Add your first ${isCommercial ? "commercial property" : "building"} to get started`}</p>
          </div>
        ) : (
          filtered.map((building, i) => (
            <motion.div key={building.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <BuildingCard building={building} isCommercial={isCommercial} onRefresh={() => setRefreshKey((k) => k + 1)} />
            </motion.div>
          ))
        )}
      </div>

      <AddBuildingDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => { setAddOpen(false); setRefreshKey((k) => k + 1); }} />
    </div>
  );
}

// Completed BuildingCard 
function BuildingCard({ building, isCommercial, onRefresh }: { building: BuildingWithStats; isCommercial: boolean; onRefresh: () => void }) {
  const router = useRouter();

  // Dynamically set colors based on the context
  const accentColor = isCommercial
    ? { bar: "bg-[#1B3B6F]", text: "text-[#1B3B6F]", light: "bg-[#1B3B6F]/10" }
    : { bar: "bg-[#2BBE9A]", text: "text-[#2BBE9A]", light: "bg-[#2BBE9A]/10" };

  return (
    <div 
      onClick={() => router.push(`/buildings/${building.id}`)}
      className={`bg-white rounded-[1.5rem] border shadow-sm p-6 cursor-pointer hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isCommercial ? "border-[#1B3B6F]/20 hover:border-[#1B3B6F]/40" : "border-slate-200/80 hover:border-teal-200"}`}
    >
      {/* Icon and Name */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${accentColor.light}`}>
          {isCommercial ? <Briefcase className={`w-7 h-7 ${accentColor.text}`} /> : <Building2 className={`w-7 h-7 ${accentColor.text}`} />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1F3A5F]">{building.name}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            {building.address || 'No address provided'}
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="flex items-center gap-6 md:gap-8">
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total {isCommercial ? "Spaces" : "Units"}</p>
          <p className="text-lg font-bold text-[#1F3A5F]">{building.total_units}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vacant</p>
          <p className="text-lg font-bold text-[#1F3A5F]">{building.vacant_units}</p>
        </div>
        
        {/* Occupancy Progress Bar */}
        <div className="text-center hidden sm:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Occupancy</p>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${accentColor.bar} transition-all duration-1000`} style={{ width: `${building.occupancy_rate}%` }} />
            </div>
            <span className={`text-sm font-bold ${accentColor.text}`}>{building.occupancy_rate}%</span>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="pl-4 border-l border-slate-100 flex items-center">
          <Button variant="ghost" className={`text-slate-400 hover:${accentColor.text} hover:${accentColor.light} rounded-xl`}>
            Manage <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}