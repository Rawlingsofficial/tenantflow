"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, User } from "lucide-react";

interface UnitHistoryDialogProps {
  open: boolean;
  unit: {
    id: string;
    unit_code: string;
  };
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

export function UnitHistoryDialog({
  open,
  unit,
  buildingName,
  onClose,
}: UnitHistoryDialogProps) {
  const supabase = createBrowserClient();
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && unit.id) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit.id]);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase
      .from("leases")
      .select(`
        id, lease_start, lease_end, rent_amount, status,
        tenants(id, first_name, last_name, photo_url, primary_phone)
      `)
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

  function formatDate(d: string | null) {
    if (!d) return "Present";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const statusBadge = (status: string) => {
    if (status === "active")
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active
        </span>
      );
    if (status === "ended")
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          Ended
        </span>
      );
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
        Terminated
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <DialogTitle className="text-sm font-semibold text-gray-900">
              Unit History
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              {buildingName} • {unit.unit_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm animate-pulse">
              Loading history...
            </div>
          ) : leases.length === 0 ? (
            <div className="py-10 text-center">
              <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No lease history found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leases.map((lease, i) => {
                const tenant = lease.tenant;
                return (
                  <div
                    key={lease.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {tenant?.photo_url ? (
                        <img
                          src={tenant.photo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-emerald-700">
                          {(tenant?.first_name || "?").charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {tenant
                            ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
                            : "Unknown Tenant"}
                        </p>
                        {statusBadge(lease.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(lease.lease_start)} —{" "}
                        {formatDate(lease.lease_end)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          $
                          {lease.rent_amount.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                          /mo
                        </span>
                        {tenant?.primary_phone && (
                          <span className="text-xs text-gray-400">
                            {tenant.primary_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


