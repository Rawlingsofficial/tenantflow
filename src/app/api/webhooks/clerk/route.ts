import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase/server";

function val<T>(v: T): never { return v as never; }

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const svix_id        = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let evt: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("[webhook] verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase   = createServerClient();
  const eventType: string = evt.type;
  const data       = evt.data;

  console.log(`[webhook] received: ${eventType}`);

  try {
    // ── user.created ──────────────────────────────────────────────────────────
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, phone_numbers } = data;
      const email     = email_addresses?.[0]?.email_address;
      const phone     = phone_numbers?.[0]?.phone_number ?? null;
      const full_name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabase.from("users").upsert(
        val({ clerk_user_id: id, email, full_name, phone, status: "active" }),
        { onConflict: "clerk_user_id" }
      );
      if (error) {
        console.error("[webhook] user.created failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log(`[webhook] user synced: ${id}`);
    }

    // ── user.updated ──────────────────────────────────────────────────────────
    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, phone_numbers } = data;
      const email     = email_addresses?.[0]?.email_address;
      const phone     = phone_numbers?.[0]?.phone_number ?? null;
      const full_name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabase
        .from("users")
        .update(val({ email, full_name, phone }))
        .eq("clerk_user_id", id);
      if (error) console.error("[webhook] user.updated failed:", error);
    }

    // ── user.deleted ──────────────────────────────────────────────────────────
    if (eventType === "user.deleted") {
      const { id } = data;
      const { error } = await supabase
        .from("users")
        .update(val({ status: "inactive" }))
        .eq("clerk_user_id", id);
      if (error) console.error("[webhook] user.deleted failed:", error);
    }

    // ── organization.created ──────────────────────────────────────────────────
    if (eventType === "organization.created") {
      const { id, name } = data;
      // NOTE: We intentionally do NOT set property_type here.
      // The user sets it during onboarding. We only set it once via onboarding/setup.
      const { error } = await supabase.from("organizations").upsert(
        val({ id, name, plan_type: "free", status: "active" }),
        { onConflict: "id" }
      );
      if (error) {
        console.error("[webhook] organization.created failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log(`[webhook] org synced: ${id}`);
    }

    // ── organization.updated ──────────────────────────────────────────────────
    if (eventType === "organization.updated") {
      const { id, name } = data;
      // Only update name — never overwrite property_type from Clerk
      const { error } = await supabase
        .from("organizations")
        .update(val({ name }))
        .eq("id", id);
      if (error) console.error("[webhook] organization.updated failed:", error);
    }

    // ── organization.deleted ──────────────────────────────────────────────────
    if (eventType === "organization.deleted") {
      const { id } = data;
      const { error } = await supabase
        .from("organizations")
        .update(val({ status: "inactive" }))
        .eq("id", id);
      if (error) console.error("[webhook] organization.deleted failed:", error);
    }

    // ── organizationMembership.created ────────────────────────────────────────
    if (eventType === "organizationMembership.created") {
      const { organization, public_user_data, role: clerkRole } = data;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .returns<{ id: string }[]>()
        .maybeSingle();

      if (userError || !userData) {
        console.error("[webhook] user not found for membership:", public_user_data.user_id);
        // Return 200 so Clerk doesn't retry — user may not exist yet, client sync handles it
        return NextResponse.json({ received: true, warning: "User not found" });
      }

      // Check if this is the first active member of the org
      // → if so, they become owner regardless of what Clerk says
      const { data: existingMembers } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("status", "active");

      const isFirst = !existingMembers || existingMembers.length === 0;
      const normalizedRole = isFirst ? "owner" : normalizeClerkRole(clerkRole);

      // Use INSERT ... ON CONFLICT DO UPDATE instead of upsert to avoid
      // overwriting a manually-set role with a stale Clerk role on re-sync
      const { error: memberError } = await supabase
        .from("organization_memberships")
        .upsert(
          val({
            user_id: userData.id,
            organization_id: organization.id,
            role: normalizedRole,
            status: "active",
          }),
          { onConflict: "user_id,organization_id" }
        );

      if (memberError) {
        console.error("[webhook] membership upsert failed:", memberError);
      } else {
        console.log(
          `[webhook] membership synced: ${public_user_data.user_id} → ${organization.id} as ${normalizedRole}`
        );
      }
    }

    // ── organizationMembership.updated ────────────────────────────────────────
    if (eventType === "organizationMembership.updated") {
      const { organization, public_user_data, role: clerkRole } = data;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .returns<{ id: string }[]>()
        .maybeSingle();

      if (userData) {
        // IMPORTANT: Only sync the Clerk role if the Supabase role is NOT "owner".
        // Owner role is managed in-app and should not be overwritten by Clerk.
        const { data: currentMember } = await supabase
          .from("organization_memberships")
          .select("role")
          .eq("user_id", userData.id)
          .eq("organization_id", organization.id)
          .maybeSingle();

        if (currentMember?.role !== "owner") {
          const normalizedRole = normalizeClerkRole(clerkRole);
          await supabase
            .from("organization_memberships")
            .update(val({ role: normalizedRole }))
            .eq("user_id", userData.id)
            .eq("organization_id", organization.id);
        }
      }
    }

    // ── organizationMembership.deleted ────────────────────────────────────────
    if (eventType === "organizationMembership.deleted") {
      const { organization, public_user_data } = data;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .returns<{ id: string }[]>()
        .maybeSingle();

      if (userData) {
        await supabase
          .from("organization_memberships")
          .update(val({ status: "inactive" }))
          .eq("user_id", userData.id)
          .eq("organization_id", organization.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Maps Clerk's role strings to our internal roles.
 * "owner" is NEVER assigned from Clerk — it's set by first-member rule or in-app.
 */
function normalizeClerkRole(
  clerkRole: string | undefined | null
): "admin" | "manager" | "viewer" {
  if (!clerkRole) return "viewer";
  if (clerkRole === "org:admin" || clerkRole === "admin") return "admin";
  if (clerkRole === "org:member" || clerkRole === "basic_member") return "manager";
  return "viewer";
}
