"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User, Mail, Phone as PhoneIcon, Shield, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountSettings() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const supabase = getSupabaseBrowserClient();

  const [fullName, setFullName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? ""
  );
  const [phone, setPhone] = useState(
    user?.primaryPhoneNumber?.phoneNumber ?? ""
  );
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return <SettingsSkeleton />;

  async function handleSave() {
    setSaving(true);
    try {
      const parts     = fullName.trim().split(" ");
      const firstName = parts[0] ?? "";
      const lastName  = parts.slice(1).join(" ") || undefined;

      await user?.update({ firstName, lastName });

      const { error } = await (supabase as any)
        .from("users")
        .update({ full_name: fullName.trim(), phone: phone || null })
        .eq("clerk_user_id", user?.id ?? "");

      if (error) throw error;
      toast.success("Account updated successfully");
    } catch (err: any) {
      toast.error(
        err?.errors?.[0]?.message ?? err?.message ?? "Failed to update account"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Profile Information" description="Update your personal details and how others see you.">
        <div className="flex flex-col sm:flex-row gap-8 items-start mb-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-md bg-slate-100">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-3xl font-bold">
                  {fullName[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <button 
              onClick={() => openUserProfile()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all border-2 border-white"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${inputCls} pl-10 h-11 rounded-xl`}
                />
              </div>
            </Field>
            <Field label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <input
                  type="email"
                  value={user?.primaryEmailAddress?.emailAddress ?? ""}
                  disabled
                  className={`${inputCls} pl-10 h-11 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200`}
                />
              </div>
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className={`${inputCls} pl-10 h-11 rounded-xl`}
                />
              </div>
            </Field>
          </div>
        </div>
        <div className="pt-4 flex justify-end border-t border-slate-100">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-6 font-bold shadow-md transition-all active:scale-95 gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </Section>

      <Section title="Account Security" description="Manage your password and security settings.">
        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white group hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Sign-in & Security</p>
              <p className="text-xs text-slate-500">Update password, enable 2FA, and manage connected accounts.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => openUserProfile()}
            className="rounded-xl border-slate-200 hover:bg-slate-50 font-semibold"
          >
            Manage Settings
          </Button>
        </div>
      </Section>
    </div>
  );
}


// ── Shared primitives (exported for use in other settings components) ──────────

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SaveButton({
  onClick,
  loading,
  label = "Save changes",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Saving…" : label}
    </button>
  );
}

export const inputCls =
  "w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
