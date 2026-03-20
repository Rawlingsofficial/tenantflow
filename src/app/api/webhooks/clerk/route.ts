import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET not set" },
      { status: 500 }
    );
  }

  // Get svix headers for verification
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  // Verify the webhook signature
  let evt: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const eventType = evt.type;
  const data = evt.data;

  console.log(`Clerk webhook received: ${eventType}`);

  try {
    // ── User Created ──────────────────────────────────────────────
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, phone_numbers } = data;
      const email = email_addresses?.[0]?.email_address;
      const phone = phone_numbers?.[0]?.phone_number || null;
      const full_name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabase.from("users").upsert(
        ({
          clerk_user_id: id,
          email,
          full_name,
          phone,
          status: "active",
        } as any),
        { onConflict: "clerk_user_id" }
      );

      if (error) {
        console.error("Failed to create user in Supabase:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`User synced to Supabase: ${id}`);
    }

    // ── User Updated ──────────────────────────────────────────────
    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, phone_numbers } = data;
      const email = email_addresses?.[0]?.email_address;
      const phone = phone_numbers?.[0]?.phone_number || null;
      const full_name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabase
        .from("users")
        .update({ email, full_name, phone } as any)
        .eq("clerk_user_id", id);

      if (error) console.error("Failed to update user:", error);
    }

    // ── User Deleted ──────────────────────────────────────────────
    if (eventType === "user.deleted") {
      const { id } = data;
      const { error } = await supabase
        .from("users")
        .update({ status: "inactive" } as any)
        .eq("clerk_user_id", id);

      if (error) console.error("Failed to deactivate user:", error);
    }

    // ── Organization Created ──────────────────────────────────────
    if (eventType === "organization.created") {
      const { id, name } = data;

      const { error } = await supabase.from("organizations").upsert(
        ({ id, name, plan_type: "free", status: "active" } as any),
        { onConflict: "id" }
      );

      if (error) {
        console.error("Failed to create org in Supabase:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`Org synced to Supabase: ${id}`);
    }

    // ── Organization Updated ──────────────────────────────────────
    if (eventType === "organization.updated") {
      const { id, name } = data;

      const { error } = await supabase
        .from("organizations")
        .update({ name } as any)
        .eq("id", id);

      if (error) console.error("Failed to update org:", error);
    }

    // ── Organization Deleted ──────────────────────────────────────
    if (eventType === "organization.deleted") {
      const { id } = data;

      const { error } = await supabase
        .from("organizations")
        .update({ status: "inactive" } as any)
        .eq("id", id);

      if (error) console.error("Failed to deactivate org:", error);
    }

    // ── Membership Created ────────────────────────────────────────
    if (eventType === "organizationMembership.created") {
      const { organization, public_user_data, role } = data;

      // Get user UUID from clerk_user_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .single();

      if (userError || !userData) {
        console.error("User not found for membership:", public_user_data.user_id);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Normalize Clerk role (org:admin → admin, org:member → manager)
      const normalizedRole = normalizeRole(role);

      const { error } = await supabase.from("organization_memberships").upsert(
        ({ user_id: userData.id, organization_id: organization.id, role: normalizedRole, status: "active" } as any),
        { onConflict: "user_id,organization_id" }
      );

      if (error) console.error("Failed to create membership:", error);
      else console.log(`Membership synced: ${public_user_data.user_id} → ${organization.id}`);
    }

    // ── Membership Updated ────────────────────────────────────────
    if (eventType === "organizationMembership.updated") {
      const { organization, public_user_data, role } = data;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .single();

      if (userData) {
        const normalizedRole = normalizeRole(role);
        await supabase
          .from("organization_memberships")
          .update({ role: normalizedRole } as any)
          .eq("user_id", userData.id)
          .eq("organization_id", organization.id);
      }
    }

    // ── Membership Deleted ────────────────────────────────────────
    if (eventType === "organizationMembership.deleted") {
      const { organization, public_user_data } = data;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .single();

      if (userData) {
        await supabase
          .from("organization_memberships")
          .update({ status: "inactive" } as any)
          .eq("user_id", userData.id)
          .eq("organization_id", organization.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Clerk uses "org:admin", "org:member" etc — normalize to your schema
function normalizeRole(clerkRole: string): "owner" | "admin" | "manager" | "viewer" {
  if (clerkRole === "org:admin") return "admin";
  if (clerkRole === "org:member") return "manager";
  if (clerkRole === "basic_member") return "manager";
  if (clerkRole === "admin") return "admin";
  return "viewer";
}
