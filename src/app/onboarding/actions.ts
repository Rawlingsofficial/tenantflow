//src/app/onboarding/actions.ts
'use server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ✅ DEBUG — paste what these print in your terminal, then we'll remove them
    console.log('[DEBUG] supabaseUrl:', supabaseUrl?.substring(0, 40));
    console.log('[DEBUG] key present:', !!supabaseServiceKey);
    console.log('[DEBUG] key prefix:', supabaseServiceKey?.substring(0, 50));
    try {
      const keyPayload = supabaseServiceKey
        ? JSON.parse(Buffer.from(supabaseServiceKey.split('.')[1], 'base64').toString())
        : null;
      console.log('[DEBUG] key role:', keyPayload?.role ?? 'COULD NOT DECODE');
    } catch {
      console.log('[DEBUG] key role: FAILED TO PARSE — key is malformed');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[FATAL] Missing Supabase environment variables. Check .env.local');
      return { error: 'Server configuration error. Please contact support.' };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 1. Get fresh user data from Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;

    if (!email) return { error: 'No email found on your account' };

    // 2. Upsert user
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        { clerk_user_id: userId, email, full_name: fullName, status: 'active' },
        { onConflict: 'clerk_user_id' }
      )
      .select('id')
      .single();

    if (userError || !userRecord) {
      console.error('[savePropertyType] user upsert failed:', userError);
      return { error: 'Failed to sync user — please try again' };
    }

    // 3. Upsert organization
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .upsert(
        { id: orgId, name: orgName, property_type: propertyType, plan_type: 'free', status: 'active' },
        { onConflict: 'id' }
      );

    if (orgError) {
      console.error('[savePropertyType] org upsert failed:', orgError);
      return { error: orgError.message };
    }

    // 4. Upsert membership
    const { error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .upsert(
        { user_id: userRecord.id, organization_id: orgId, role: 'owner', status: 'active' },
        { onConflict: 'user_id,organization_id' }
      );

    if (membershipError) {
      console.error('[savePropertyType] membership upsert failed:', membershipError);
    }

    return { error: null };
  } catch (err) {
    console.error('[savePropertyType] unexpected error:', err);
    return { error: 'Internal server error' };
  }
}

