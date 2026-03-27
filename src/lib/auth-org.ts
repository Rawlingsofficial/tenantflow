// src/lib/auth-org.ts
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from './supabase/server';

export async function getCurrentUserOrganizationIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  // 🔥 FIX 1: Explicitly type userData so TS recognizes .id
  const { data: userData, error: userError } = (await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()) as { data: { id: string } | null; error: any };

  if (userError || !userData) {
    console.error('[auth-org] user not found for clerk_user_id:', userId);
    return [];
  }

  // 🔥 FIX 2: Explicitly type the memberships data so TS allows .map() and recognizes .organization_id
  const { data, error } = (await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active')) as { data: { organization_id: string }[] | null; error: any };

  if (error) {
    console.error('[auth-org] Error fetching user organizations:', error);
    return [];
  }

  // 🔥 FIX 3: Add a fallback to an empty array just in case data is null
  return (data || []).map(m => m.organization_id);
}

export async function validateOrganizationAccess(orgId: string): Promise<boolean> {
  const allowedOrgs = await getCurrentUserOrganizationIds();
  return allowedOrgs.includes(orgId);
}

export async function getCurrentOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}

