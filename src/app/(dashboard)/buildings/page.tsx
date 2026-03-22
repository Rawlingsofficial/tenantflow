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
import {
  Search, Plus, Building2, Home, ChevronDown, ChevronUp,
  MapPin, ArrowUpRight, CheckCircle2, AlertCircle, Wrench
} from "lucide-react";

type UnitFilter = "all" | "occupied" | "vacant" | "maintenance";

interface BuildingWithStats {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  maintenance_units: number;
  occupancy_rate: number;
}

export default function BuildingsPage() {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  const [buildings, setBuildings] = useState<BuildingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UnitFilter>("all");
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
        .select("id, name, address, status, photo_url, organization_id, units(id, status)")
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

  const filtered = buildings.filter((b) => {
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.address || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === "occupied") return b.occupied_units > 0;
    if (statusFilter === "vacant") return b.vacant_units > 0;
    if (statusFilter === "maintenance") return b.maintenance_units > 0;
    return true;
  });

  const tabs: { label: string; value: UnitFilter; count: number }[] = [
    { label: "All", value: "all", count: buildings.length },
    { label: "Has Occupied", value: "occupied", count: buildings.filter(b => b.occupied_units > 0).length },
    { label: "Has Vacant", value: "vacant", count: buildings.filter(b => b.vacant_units > 0).length },
    { label: "Maintenance", value: "maintenance", count: buildings.filter(b => b.maintenance_units > 0).length },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Buildings & Units</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {buildings.length} propert{buildings.length !== 1 ? "ies" : "y"} · {buildings.reduce((s, b) => s + b.total_units, 0)} units total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search buildings…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-56 bg-white border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-teal-400/25"
              />
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Building
            </Button>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-4 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                statusFilter === tab.value
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                statusFilter === tab.value ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
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
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <Building2 className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No buildings found</p>
            <p className="text-slate-400 text-xs mt-1">
              {search ? "Try a different search term" : "Add your first building to get started"}
            </p>
          </div>
        ) : (
          filtered.map((building, i) => (
            <motion.div
              key={building.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <BuildingCard building={building} onRefresh={() => setRefreshKey((k) => k + 1)} />
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

// ─── Building Card ────────────────────────────────────────────

function BuildingCard({ building, onRefresh }: { building: BuildingWithStats; onRefresh: () => void }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  async function fetchUnits() {
    setLoadingUnits(true);
    const { data } = await supabase
      .from("units")
      .select(`id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status,
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

  const occupancyColor =
    building.occupancy_rate >= 80 ? "text-teal-600" :
    building.occupancy_rate >= 50 ? "text-amber-500" :
    "text-red-500";

  const occupancyBg =
    building.occupancy_rate >= 80 ? "bg-teal-500" :
    building.occupancy_rate >= 50 ? "bg-amber-400" :
    "bg-red-400";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card body */}
      <div className="p-5 flex gap-5">
        {/* Photo / placeholder */}
        <div
          className="w-36 h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer border border-slate-200/60"
          onClick={() => router.push(`/buildings/${building.id}`)}
        >
          {building.photo_url ? (
            <img src={building.photo_url} alt={building.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1B3B6F]/5 to-teal-500/5">
              <Building2 className="h-8 w-8 text-slate-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2
                className="text-base font-bold text-slate-900 hover:text-teal-700 cursor-pointer transition-colors flex items-center gap-1.5"
                onClick={() => router.push(`/buildings/${building.id}`)}
              >
                {building.name}
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </h2>
              {building.address && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {building.address}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
              building.status === "active"
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${building.status === "active" ? "bg-teal-500 animate-pulse" : "bg-slate-400"}`} />
              {building.status}
            </span>
          </div>

          {/* Metric chips */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {[
              { icon: Home, label: "Total", value: building.total_units, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
              { icon: CheckCircle2, label: "Occupied", value: building.occupied_units, color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
              { icon: Home, label: "Vacant", value: building.vacant_units, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
              { icon: Wrench, label: "Maintenance", value: building.maintenance_units, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
            ].map((chip) => (
              <div key={chip.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${chip.bg} ${chip.color}`}>
                <chip.icon className="h-3 w-3" />
                <span>{chip.value}</span>
                <span className="font-normal opacity-70 text-[10px]">{chip.label}</span>
              </div>
            ))}

            {/* Occupancy rate */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 ml-auto">
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${occupancyBg}`} style={{ width: `${building.occupancy_rate}%` }} />
              </div>
              <span className={`text-xs font-bold tabular-nums ${occupancyColor}`}>{building.occupancy_rate}%</span>
            </div>

            {/* Add unit button */}
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); setAddUnitOpen(true); }}
              className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 rounded-xl shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Unit
            </Button>
          </div>
        </div>
      </div>

      {/* Expand units toggle */}
      <div className="border-t border-slate-100">
        <button
          onClick={toggleUnits}
          className="w-full px-5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 hover:bg-slate-50/70 transition-colors"
        >
          <span className="flex-1 text-left text-slate-600">Units ({building.total_units})</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-slate-100"
            >
              {loadingUnits ? (
                <div className="px-5 py-5 text-xs text-slate-400 text-center animate-pulse">Loading units…</div>
              ) : (
                <UnitsMiniTable units={units} />
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

// ─── Units mini table ─────────────────────────────────────────

function UnitStatusBadge({ status }: { status: string }) {
  if (status === "occupied")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Occupied
      </span>
    );
  if (status === "vacant")
    return (
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

function UnitsMiniTable({ units }: { units: any[] }) {
  const router = useRouter();

  if (units.length === 0) {
    return (
      <div className="px-5 py-6 text-sm text-slate-400 text-center">
        No units added yet.
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50/60">
          <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bed/Bath</th>
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
              className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors group"
              onClick={() => router.push(`/buildings/${unit.building_id || ""}?unit=${unit.id}`)}
            >
              <td className="px-5 py-2.5">
                <span className="font-mono font-semibold text-slate-700 text-xs">{unit.unit_code}</span>
              </td>
              <td className="px-3 py-2.5 text-slate-500">
                {(unit.bedrooms ?? "—")}bd · {(unit.bathrooms ?? "—")}ba
              </td>
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
                  : <span className="text-slate-300">—</span>
                }
              </td>
              <td className="px-5 py-2.5"><UnitStatusBadge status={unit.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}


