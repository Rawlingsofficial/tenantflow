"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { AddUnitDialog } from "@/components/buildings/AddUnitDialog";
import { UnitHistoryDialog } from "@/components/buildings/UnitHistoryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Building2,
  ChevronRight,
  MoreHorizontal,
  Phone,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type UnitView = "all" | "occupied" | "vacant" | "unavailable";

interface Building {
  id: string;
  name: string;
  address: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string;
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

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgId } = useOrg();
  const supabase = createBrowserClient();

  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitView, setUnitView] = useState<UnitView>("all");
  const [search, setSearch] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "overview" | "files" | "settings">("units");
  const [refreshKey, setRefreshKey] = useState(0);

  // Recently active tenant (for header widget)
  const [recentTenant, setRecentTenant] = useState<{
    name: string;
    date: string;
    photo_url?: string;
    units?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch building
      const { data: bData } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();
      setBuilding(bData || null);

      // Fetch units with active leases + tenant info
      const { data: uData } = await supabase
        .from("units")
        .select(`
          id, unit_code, unit_type, bedrooms, bathrooms, default_rent, status, building_id,
          leases(
            id, tenant_id, lease_start, lease_end, rent_amount, status,
            tenants(id, first_name, last_name, primary_phone, photo_url)
          )
        `)
        .eq("building_id", id)
        .order("unit_code");

      const enriched: Unit[] = (uData || []).map((u: any) => {
        const activeLease = (u.leases || []).find(
          (l: any) => l.status === "active"
        );
        return {
          id: u.id,
          unit_code: u.unit_code,
          unit_type: u.unit_type,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          default_rent: u.default_rent,
          status: u.status,
          building_id: u.building_id,
          activeLease: activeLease
            ? {
                id: activeLease.id,
                tenant_id: activeLease.tenant_id,
                lease_start: activeLease.lease_start,
                lease_end: activeLease.lease_end,
                rent_amount: activeLease.rent_amount,
                status: activeLease.status,
                tenant: activeLease.tenants || null,
              }
            : undefined,
        };
      });

      setUnits(enriched);

      // Set recent tenant (most recent active lease)
      const withTenant = enriched.filter((u) => u.activeLease?.tenant);
      if (withTenant.length > 0) {
        const t = withTenant[0].activeLease!.tenant!;
        setRecentTenant({
          name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
          date: new Date(withTenant[0].activeLease!.lease_start).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
          ),
          photo_url: t.photo_url || undefined,
          units: withTenant.length,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const filteredUnits = units.filter((u) => {
    const matchSearch =
      !search ||
      u.unit_code.toLowerCase().includes(search.toLowerCase()) ||
      (u.activeLease?.tenant?.first_name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (u.activeLease?.tenant?.last_name || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (unitView === "occupied") return u.status === "occupied";
    if (unitView === "vacant") return u.status === "vacant";
    if (unitView === "unavailable") return u.status === "maintenance";
    return true;
  });

  const occupied = units.filter((u) => u.status === "occupied").length;
  const vacant = units.filter((u) => u.status === "vacant").length;
  const maintenance = units.filter((u) => u.status === "maintenance").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">
          Loading building...
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Building not found.</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => router.push("/buildings")}
          >
            Back to Buildings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      {/* Header bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/buildings")}
            className="flex items-center gap-1 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span
            className="hover:text-gray-800 cursor-pointer"
            onClick={() => router.push("/buildings")}
          >
            {building.name}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-800 font-medium">Unit Details</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-gray-500 hover:text-gray-700"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setAddUnitOpen(true)}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 rounded-lg flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Unit
          </Button>
        </div>
      </div>

      {/* Building Title */}
      <div className="px-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">{building.name}</h1>
      </div>

      {/* Content grid */}
      <div className="px-6 flex gap-5 flex-1">
        {/* Left: Unit detail panel */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mb-0">
            {(["units", "overview", "files", "settings"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                    activeTab === tab
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {activeTab === "units" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm">
              {/* Unit filter tabs */}
              <div className="px-4 pt-3 pb-0 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { label: "Units", value: "all" },
                      { label: "Occupied", value: "occupied" },
                      { label: "Vacant", value: "vacant" },
                      { label: "Unavailable", value: "unavailable" },
                    ] as { label: string; value: UnitView }[]
                  ).map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setUnitView(tab.value)}
                      className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                        unitView === tab.value
                          ? "border-emerald-600 text-emerald-700"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search units..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-7 w-44 text-xs bg-gray-50 border-gray-200 rounded-md"
                  />
                </div>
              </div>

              {/* Units table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Unit
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Bathrooms
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Lease End ↕
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        No units match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((unit) => (
                      <UnitRow
                        key={unit.id}
                        unit={unit}
                        onHistory={() => setHistoryUnit(unit)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm p-6">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Units" value={units.length} />
                <StatCard
                  label="Occupied"
                  value={occupied}
                  color="text-emerald-600"
                />
                <StatCard label="Vacant" value={vacant} color="text-blue-600" />
                <StatCard
                  label="Maintenance"
                  value={maintenance}
                  color="text-amber-600"
                />
                <StatCard
                  label="Occupancy Rate"
                  value={
                    units.length > 0
                      ? `${Math.round((occupied / units.length) * 100)}%`
                      : "0%"
                  }
                />
              </div>
              {building.address && (
                <div className="mt-6 pt-5 border-t border-gray-50">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                    Address
                  </p>
                  <p className="text-sm text-gray-700">{building.address}</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === "files" || activeTab === "settings") && (
            <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm py-16">
              {activeTab === "files" ? "No files uploaded yet." : "Building settings coming soon."}
            </div>
          )}
        </div>

        {/* Right: tenant activity sidebar */}
        {recentTenant && (
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                  Active Tenant
                </span>
                <button className="text-xs text-emerald-600 hover:underline">
                  Search: New
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden">
                  {recentTenant.photo_url ? (
                    <img
                      src={recentTenant.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-700 font-semibold text-sm">
                      {recentTenant.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {recentTenant.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {recentTenant.date}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {recentTenant.units} unit
                    {(recentTenant.units || 0) > 1 ? "s" : ""} rented
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                Unit Summary
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Occupied</span>
                <span className="font-semibold text-emerald-700">
                  {occupied}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Vacant</span>
                <span className="font-semibold text-gray-700">{vacant}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Maintenance</span>
                <span className="font-semibold text-amber-600">
                  {maintenance}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-gray-50">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-gray-800">
                  {units.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddUnitDialog
        open={addUnitOpen}
        buildingId={building.id}
        buildingName={building.name}
        onClose={() => setAddUnitOpen(false)}
        onSuccess={() => {
          setAddUnitOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />

      {historyUnit && (
        <UnitHistoryDialog
          open={!!historyUnit}
          unit={historyUnit}
          buildingName={building.name}
          onClose={() => setHistoryUnit(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-gray-800",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function UnitRow({
  unit,
  onHistory,
}: {
  unit: Unit;
  onHistory: () => void;
}) {
  const router = useRouter();
  const tenant = unit.activeLease?.tenant;
  const leaseEnd = unit.activeLease?.lease_end;

  const leaseEndFormatted = leaseEnd
    ? new Date(leaseEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isPastDue = leaseEnd ? new Date(leaseEnd) < new Date() : false;
  const isDueSoon =
    leaseEnd &&
    !isPastDue &&
    new Date(leaseEnd) <
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const statusEl = () => {
    if (unit.status === "occupied")
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            IDC Rented
          </span>
          {isPastDue && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              Past Due
            </span>
          )}
          {isDueSoon && !isPastDue && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Due Soon
            </span>
          )}
          {unit.activeLease?.rent_amount && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Paid
            </span>
          )}
        </div>
      );
    if (unit.status === "vacant")
      return (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-gray-200 text-gray-500">
            Vacant
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                To LBO ▾
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Mark Occupied</DropdownMenuItem>
              <DropdownMenuItem>Set Maintenance</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        Maintenance
      </span>
    );
  };

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-3 w-3 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{unit.unit_code}</p>
            {tenant && (
              <p className="text-gray-500 text-[10px]">
                {tenant.first_name} {tenant.last_name}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-gray-500">
        {unit.bathrooms ?? "—"}
      </td>
      <td className="px-3 py-3">
        {leaseEndFormatted ? (
          <span
            className={`text-[11px] ${
              isPastDue
                ? "text-red-600 font-medium"
                : isDueSoon
                ? "text-amber-600"
                : "text-gray-500"
            }`}
          >
            {leaseEndFormatted}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-3">{statusEl()}</td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100">
              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onHistory}>
              View History
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                tenant &&
                router.push(`/tenants/${tenant.id}`)
              }
              disabled={!tenant}
            >
              View Tenant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}


