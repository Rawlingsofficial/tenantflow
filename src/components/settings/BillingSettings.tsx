"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSupabaseWithAuth } from "@/lib/supabase/client";
import { CheckCircle2, AlertCircle, CreditCard, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Section, SettingsSkeleton } from "./AccountSettings";
import { Button } from "@/components/ui/button";

type PlanType = "free" | "pro" | "enterprise";

type OrgData = {
  plan_type: PlanType;
  unit_limit: number;
  user_limit: number;
  status: string;
  units_used?: number;
  users_used?: number;
};

const PLANS: {
  id: PlanType;
  label: string;
  price: string;
  units: number;
  users: number;
  features: string[];
  color: string;
}[] = [
  {
    id: "free",
    label: "Free",
    price: "$0",
    units: 50,
    users: 5,
    features: ["Up to 50 units", "Up to 5 team members", "Basic reports", "Standard support"],
    color: "slate",
  },
  {
    id: "pro",
    label: "Professional",
    price: "$49",
    units: 500,
    users: 25,
    features: ["Up to 500 units", "Up to 25 team members", "Advanced reports", "Priority support", "Export data"],
    color: "teal",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    price: "Custom",
    units: 99999,
    users: 99999,
    features: ["Unlimited units", "Unlimited team members", "Custom reports", "Dedicated support", "SLA guarantee", "Custom integrations"],
    color: "indigo",
  },
];

export default function BillingSettings() {
  const { orgId, isLoaded, getToken } = useAuth();
  const supabase = useSupabaseWithAuth();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !orgId) return;

    const fetchOrg = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("plan_type, unit_limit, user_limit, status, units_used, users_used")
          .eq("id", orgId)
          .maybeSingle();

        if (error) throw error;
        setOrg(data as OrgData | null);
      } catch (err: any) {
        console.error("Failed to fetch org:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
  }, [orgId, isLoaded, supabase]);

  if (loading) return <SettingsSkeleton />;
  if (!org) return <p className="text-sm text-gray-500 p-6">Organization billing profile not initialized.</p>;

  const currentPlan = PLANS.find((p) => p.id === org.plan_type) ?? PLANS[0];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Active Subscription ── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Subscription</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900">{currentPlan.label}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold uppercase tracking-wider">
                {org.status}
              </span>
            </div>
            <p className="text-slate-500 mt-1 text-sm">Next billing date: April 28, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl border-slate-200 h-11 px-6 font-bold text-slate-600">
              View Invoices
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-slate-900/20">
              Change Plan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <UsageMetric 
            label="Portfolio Units" 
            used={org.units_used ?? 0} 
            limit={org.unit_limit} 
            icon={Zap}
            color="teal"
          />
          <UsageMetric 
            label="Team Member Seats" 
            used={org.users_used ?? 0} 
            limit={org.user_limit} 
            icon={ShieldCheck}
            color="indigo"
          />
        </div>
      </div>

      {/* ── Plan Comparison ── */}
      <Section title="Upgrade Your Portfolio" description="Scale your operations with advanced enterprise features.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mt-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === org.plan_type;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-[1.5rem] border p-6 transition-all relative ${
                  isCurrent 
                    ? "border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02] z-10" 
                    : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-teal-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    Active Plan
                  </div>
                )}

                <div className="mb-6">
                  <p className={`font-bold text-sm uppercase tracking-widest ${isCurrent ? 'text-teal-400' : 'text-slate-400'}`}>
                    {plan.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-3xl font-black ${isCurrent ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-xs font-medium opacity-60">/month</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-xs font-medium">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-teal-400' : 'text-teal-500'}`} />
                      <span className={isCurrent ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  disabled={isCurrent}
                  className={`w-full h-11 rounded-xl font-bold transition-all ${
                    isCurrent
                      ? "bg-white/10 text-white cursor-default border border-white/10"
                      : plan.id === "enterprise"
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }`}
                >
                  {isCurrent ? "Current Plan" : plan.id === "enterprise" ? "Contact Sales" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="p-6 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <CreditCard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Payment Method</h4>
            <p className="text-xs text-slate-500 mt-0.5">Mastercard ending in •••• 4242</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl border-indigo-200 bg-white text-indigo-600 font-bold text-xs h-9 px-4 hover:bg-indigo-50">
          Update Card
        </Button>
      </div>
    </div>
  );
}

function UsageMetric({ label, used, limit, icon: Icon, color }: { label: string; used: number; limit: number; icon: any; color: 'teal' | 'indigo' }) {
  const pct = Math.min((used / limit) * 100, 100);
  const isUnlimited = limit >= 99999;
  
  const colors = {
    teal: { bar: "bg-teal-500", text: "text-teal-600", bg: "bg-teal-50" },
    indigo: { bar: "bg-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${colors[color].bg}`}>
            <Icon className={`w-3.5 h-3.5 ${colors[color].text}`} />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-900">
          {isUnlimited ? "Unlimited" : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${colors[color].bar}`}
          style={{ width: isUnlimited ? "100%" : `${pct}%`, opacity: isUnlimited ? 0.2 : 1 }}
        />
      </div>
    </div>
  );
}