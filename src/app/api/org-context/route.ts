// src/app/api/org-context/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ org: null, role: null }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get internal user UUID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (userError || !userData) {
      console.log('[org-context] user not found yet:', userError?.message);
      return NextResponse.json({ org: null, role: null });
    }

    // Get membership for this specific org
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('user_id', userData.id)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError || !membership) {
      console.log('[org-context] membership not found yet:', membershipError?.message);
      return NextResponse.json({ org: null, role: null });
    }

    // Get org details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, property_type')
      .eq('id', orgId)
      .maybeSingle();

    if (orgError || !org) {
      console.log('[org-context] org not found yet:', orgError?.message);
      return NextResponse.json({ org: null, role: null });
    }

    return NextResponse.json({ org, role: membership.role });
  } catch (err) {
    console.error('[org-context] error:', err);
    return NextResponse.json({ org: null, role: null }, { status: 500 });
  }
}
