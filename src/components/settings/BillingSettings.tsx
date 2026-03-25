"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase/client";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Section, SettingsSkeleton } from "./AccountSettings";

type PlanType = "free" | "pro" | "enterprise";

type OrgData = {
  plan_type: PlanType;
  unit_limit: number;
  user_limit: number;
  status: string;
};

const PLANS: {
  id: PlanType;
  label: string;
  price: string;
  units: number;
  users: number;
  features: string[];
}[] = [
  {
    id: "free",
    label: "Free",
    price: "$0/mo",
    units: 50,
    users: 5,
    features: ["Up to 50 units", "Up to 5 team members", "Basic reports", "Standard support"],
  },
  {
    id: "pro",
    label: "Pro",
    price: "$49/mo",
    units: 500,
    users: 25,
    features: ["Up to 500 units", "Up to 25 team members", "Advanced reports", "Priority support", "Export data"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    price: "Custom",
    units: 99999,
    users: 99999,
    features: ["Unlimited units", "Unlimited team members", "Custom reports", "Dedicated support", "SLA guarantee", "Custom integrations"],
  },
];

export default function BillingSettings() {
  const { orgId } = useAuth();
  const supabase = createBrowserClient();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    fetchOrg();
  }, [orgId]);

  async function fetchOrg() {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("plan_type, unit_limit, user_limit, status")
      .eq("id", orgId!)
      .single();
    setOrg(data as OrgData | null);
    setLoading(false);
  }

  if (loading) return <SettingsSkeleton />;
  if (!org) return null;

  const currentPlan = PLANS.find((p) => p.id === org.plan_type) ?? PLANS[0];

  return (
    <div className="space-y-6">
      {/* Current plan summary */}
      <Section title="Current Plan" description="Your active subscription and usage.">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-gray-900 capitalize">
                {currentPlan.label}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  org.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {org.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{currentPlan.price}</p>
          </div>
        </div>

        {/* Usage bars */}
        <div className="mt-5 space-y-4">
          <UsageBar
            label="Units"
            limit={org.unit_limit}
            used={undefined}
            max={currentPlan.units}
          />
          <UsageBar
            label="Team Members"
            limit={org.user_limit}
            used={undefined}
            max={currentPlan.users}
          />
        </div>
      </Section>

      {/* Plan cards */}
      <Section
        title="Available Plans"
        description="Upgrade or downgrade your plan at any time."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === org.plan_type;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 relative transition-all ${
                  isCurrent
                    ? "border-gray-900 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-4 text-xs bg-gray-900 text-white px-2.5 py-0.5 rounded-full font-medium">
                    Current plan
                  </span>
                )}

                <p className="font-semibold text-gray-900">{plan.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 mb-4">
                  {plan.price}
                </p>

                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={() =>
                      alert(
                        "Billing upgrade is handled via your payment provider. Contact support to upgrade."
                      )
                    }
                    className="w-full py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {plan.id === "enterprise" ? "Contact us" : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Plan changes take effect immediately. To cancel or request a refund, contact{" "}
            <a href="mailto:support@example.com" className="underline font-medium">
              support@example.com
            </a>
          </p>
        </div>
      </Section>
    </div>
  );
}

function UsageBar({
  label,
  limit,
  used,
  max,
}: {
  label: string;
  limit: number;
  used?: number;
  max: number;
}) {
  const pct = used !== undefined ? Math.min((used / limit) * 100, 100) : null;
  const unlimited = limit >= 99999;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>
          {unlimited ? "Unlimited" : `${used ?? "?"} / ${limit} limit`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct !== null && pct > 85
              ? "bg-red-500"
              : pct !== null && pct > 60
              ? "bg-amber-400"
              : "bg-gray-900"
          }`}
          style={{ width: unlimited ? "100%" : `${pct ?? 10}%`, opacity: unlimited ? 0.15 : 1 }}
        />
      </div>
    </div>
  );
}


