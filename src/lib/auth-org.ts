// src/lib/auth-org.ts
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from './supabase/server';

export async function getCurrentUserOrganizationIds(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createServerClient();

  // Get internal user UUID from clerk_user_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (userError || !userData) {
    console.error('[auth-org] user not found for clerk_user_id:', userId);
    return [];
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.id)
    .eq('status', 'active');

  if (error) {
    console.error('[auth-org] Error fetching user organizations:', error);
    return [];
  }

  return data.map(m => m.organization_id);
}

export async function validateOrganizationAccess(orgId: string): Promise<boolean> {
  const allowedOrgs = await getCurrentUserOrganizationIds();
  return allowedOrgs.includes(orgId);
}

export async function getCurrentOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
