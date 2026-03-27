'use server';

import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

export async function savePropertyType({
  orgId,
  orgName,
  propertyType,
}: {
  orgId: string;
  orgName: string;
  propertyType: 'residential' | 'commercial';
}): Promise<{ error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: 'Not authenticated' };

    const supabase = createServerClient();

    // 1. Get fresh user data from Clerk
    // NOTE: clerkClient() must be awaited in Clerk v5+
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const fullName =
      `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;

    if (!email) return { error: 'No email found on your account' };

    // 2. Upsert user — safe whether webhook has fired or not
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          clerk_user_id: userId,
          email,
          full_name: fullName,
          status: 'active',
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id')
      .single();

    if (userError || !userRecord) {
      console.error('[savePropertyType] user upsert failed:', userError);
      return { error: 'Failed to sync user — please try again' };
    }

    // 3. Upsert organization with property_type
    const { error: orgError } = await supabase
      .from('organizations')
      .upsert(
        {
          id: orgId,
          name: orgName,
          property_type: propertyType,
          plan_type: 'free',
          status: 'active',
        },
        { onConflict: 'id' }
      );

    if (orgError) {
      console.error('[savePropertyType] org upsert failed:', orgError);
      return { error: orgError.message };
    }

    // 4. Upsert membership as owner
    const { error: membershipError } = await supabase
      .from('organization_memberships')
      .upsert(
        {
          user_id: userRecord.id,
          organization_id: orgId,
          role: 'owner',
          status: 'active',
        },
        { onConflict: 'user_id,organization_id' }
      );

    if (membershipError) {
      console.error('[savePropertyType] membership upsert failed:', membershipError);
      // Non-fatal: webhook may have already created it
    }

    return { error: null };
  } catch (err) {
    console.error('[savePropertyType] unexpected error:', err);
    return { error: 'Internal server error' };
  }
}
