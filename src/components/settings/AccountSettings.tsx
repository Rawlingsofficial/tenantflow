"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

export default function AccountSettings() {
  const { user, isLoaded } = useUser();
  const { orgId } = useAuth(); // <-- added
  const supabase = getSupabaseBrowserClient();
  const { role, loading: roleLoading } = useRole();

  const [fullName, setFullName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ?? ""
  );
  const [phone, setPhone] = useState(
    user?.primaryPhoneNumber?.phoneNumber ?? ""
  );
  const [saving, setSaving] = useState(false);

  if (!isLoaded) {
    return <SettingsSkeleton />;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const parts = fullName.trim().split(" ");
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ") || undefined;

      await user?.update({ firstName, lastName });

      const { error } = await (supabase
        .from("users") as any)
        .update({ full_name: fullName.trim(), phone: phone || null })
        .eq("clerk_user_id", user?.id ?? "");

      if (error) throw error;
      toast.success("Account updated successfully");
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message ?? err?.message ?? "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Debug section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 space-y-2">
        <p className="text-sm text-gray-600">
          Role loading: <span className="font-mono">{roleLoading ? "true" : "false"}</span>
        </p>
        {role && (
          <p className="text-sm text-gray-600">
            Your role: <span className="font-medium capitalize">{role}</span>
          </p>
        )}
        {orgId && (
          <p className="text-xs text-gray-500">
            Org ID: <span className="font-mono">{orgId}</span>
          </p>
        )}
        {!role && !roleLoading && (
          <p className="text-sm text-red-600">
            No role found. Please ensure your membership exists and is active.
          </p>
        )}
      </div>

      <Section title="Profile" description="Your personal information.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={user?.primaryEmailAddress?.emailAddress ?? ""}
              disabled
              className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Managed by your sign-in provider.
            </p>
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="pt-4 flex justify-end">
          <SaveButton onClick={handleSave} loading={saving} />
        </div>
      </Section>

      <Section title="Password" description="Change your sign-in password.">
        <p className="text-sm text-gray-500">
          Password management is handled through{" "}
          <span className="font-medium text-gray-700">Clerk</span>. Click below
          to open the password update flow.
        </p>
        <div className="pt-4">
          <button
            onClick={() => user?.update({})}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Change Password
          </button>
        </div>
      </Section>
    </div>
  );
}

// ─── Shared primitives (unchanged) ────────────────────────────────────

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

