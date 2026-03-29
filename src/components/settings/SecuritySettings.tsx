"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { Shield, Lock, Smartphone, Download, AlertTriangle } from "lucide-react";
import { Section, SettingsSkeleton } from "./AccountSettings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SecuritySettings() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();

  if (!isLoaded) return <SettingsSkeleton />;

  const hasTwoFactor = user?.twoFactorEnabled;

  const handleExportData = () => {
    toast.info("Preparing your organization data archive. You will receive an email when it's ready.");
  };

  return (
    <div className="space-y-6">
      <Section
        title="Authentication"
        description="Manage how you and your team access the organization."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasTwoFactor ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                {hasTwoFactor ? <Shield className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-slate-500">
                  {hasTwoFactor ? "Your account is protected with 2FA." : "Add an extra layer of security to your account."}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openUserProfile()} className="rounded-xl">
              {hasTwoFactor ? "Manage" : "Enable"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Session Management</p>
                <p className="text-xs text-slate-500">See and log out of your active sessions across devices.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openUserProfile()} className="rounded-xl">
              View Sessions
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Organization Security"
        description="Enterprise-level security controls for your organization."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#1B3B6F]" />
              <p className="text-sm font-semibold text-slate-900">Single Sign-On (SSO)</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B3B6F] text-white uppercase tracking-wider">Enterprise</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enforce SSO via Okta, Azure AD, or Google Workspace for all team members.
            </p>
            <Button disabled variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white">
              Configure SAML/OIDC
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-[#1B3B6F]" />
              <p className="text-sm font-semibold text-slate-900">Enforce 2FA</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B3B6F] text-white uppercase tracking-wider">Enterprise</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Require all administrators and managers to enable two-factor authentication.
            </p>
            <Button disabled variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white">
              Enforce Policy
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Data & Compliance"
        description="Export and manage your organization's data."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Full Data Export</p>
                <p className="text-xs text-slate-500">Download all tenants, leases, and payment history in CSV/JSON format.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData} className="rounded-xl border-slate-200">
              Export All Data
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
