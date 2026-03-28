// src/components/buildings/EditUnitDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, User, Clock, DollarSign, Phone, CalendarRange } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface UnitHistoryDialogProps {
  open: boolean;
  unit: { id: string; unit_code: string };
  buildingName: string;
  onClose: () => void;
}

interface LeaseRecord {
  id: string;
  lease_start: string;
  lease_end: string | null;
  rent_amount: number;
  status: string;
  tenant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
    primary_phone: string | null;
  } | null;
}

function StatusPill({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Active
      </span>
    );
  if (status === "ended")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Ended
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Terminated
    </span>
  );
}

export function UnitHistoryDialog({ open, unit, buildingName, onClose }: UnitHistoryDialogProps) {
  const supabase = createBrowserClient();
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && unit.id) fetchHistory();
  }, [open, unit.id]);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase
      .from("leases")
      .select(`id, lease_start, lease_end, rent_amount, status,
        tenants(id, first_name, last_name, photo_url, primary_phone)`)
      .eq("unit_id", unit.id)
      .order("lease_start", { ascending: false });

    setLeases(
      (data || []).map((l: any) => ({
        id: l.id,
        lease_start: l.lease_start,
        lease_end: l.lease_end,
        rent_amount: l.rent_amount,
        status: l.status,
        tenant: l.tenants || null,
      }))
    );
    setLoading(false);
  }

  function duration(start: string, end: string | null) {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const days = differenceInDays(e, s);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${(days / 365).toFixed(1)}yr`;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#1B3B6F]/4 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B3B6F] shadow-sm">
              <CalendarRange className="h-4 w-4 text-[#14b8a6]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900">Unit History</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {buildingName} · <span className="font-mono font-semibold text-slate-600">{unit.unit_code}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="h-6 w-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading history…</p>
            </div>
          ) : leases.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
                <User className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No lease history</p>
              <p className="text-xs text-slate-400">This unit hasn't been leased yet.</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical timeline line */}
              <div className="absolute left-[22px] top-6 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent pointer-events-none" />

              {leases.map((lease, i) => {
                const tenant = lease.tenant;
                const name = tenant
                  ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
                  : "Unknown Tenant";
                const initial = name.charAt(0).toUpperCase();
                const isActive = lease.status === "active";

                return (
                  <div key={lease.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* Timeline dot */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm ${
                        isActive ? "ring-2 ring-teal-400/30" : ""
                      }`}
                        style={{ background: isActive ? "linear-gradient(135deg, #1B3B6F, #2a4f8f)" : "#f1f5f9" }}>
                        {tenant?.photo_url ? (
                          <img src={tenant.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className={`text-sm font-bold ${isActive ? "text-[#14b8a6]" : "text-slate-500"}`}>
                            {initial}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{name}</p>
                        <StatusPill status={lease.status} />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Period */}
                        <div className="col-span-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>
                            {format(new Date(lease.lease_start), "MMM d, yyyy")}
                            {" — "}
                            {lease.lease_end
                              ? format(new Date(lease.lease_end), "MMM d, yyyy")
                              : <span className="text-teal-600 font-medium">Present</span>
                            }
                          </span>
                          <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                            {duration(lease.lease_start, lease.lease_end)}
                          </span>
                        </div>

                        {/* Rent */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <DollarSign className="h-3 w-3 text-teal-500 shrink-0" />
                          <span className="font-bold text-slate-800 tabular-nums">
                            ${lease.rent_amount.toLocaleString()}<span className="font-normal text-slate-400">/mo</span>
                          </span>
                        </div>
                      </div>

                      {tenant?.primary_phone && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                          <Phone className="h-3 w-3" />
                          {tenant.primary_phone}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && leases.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {leases.length} lease record{leases.length !== 1 ? "s" : ""} · {leases.filter(l => l.status === "active").length} active
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
