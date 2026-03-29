"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Section, SettingsSkeleton } from "./AccountSettings";
import { Activity, User, Clock, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import type { AuditLog } from "@/types";

type AuditLogWithUser = AuditLog & {
  users: {
    full_name: string | null;
    email: string;
  } | null;
};

export default function AuditLogSettings() {
  const { orgId } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("*, users ( full_name, email )")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const userName = log.users?.full_name?.toLowerCase() ?? "";
    const userEmail = log.users?.email?.toLowerCase() ?? "";
    const action = log.action?.toLowerCase() ?? "";
    const entity = log.entity_type?.toLowerCase() ?? "";
    
    return !q || userName.includes(q) || userEmail.includes(q) || action.includes(q) || entity.includes(q);
  });

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      <Section
        title="Activity Log"
        description="A detailed record of actions performed within your organization."
      >
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by user, action, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                      {search ? "No matches found" : "No activity recorded yet"}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {(log.users?.full_name ?? log.users?.email ?? "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {log.users?.full_name ?? "System"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {log.users?.email ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {log.action}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 uppercase">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at!), "MMM d, h:mm a")}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Activity className="h-3 w-3" />
          Showing the last 100 organization activities
        </div>
      </Section>
    </div>
  );
}
