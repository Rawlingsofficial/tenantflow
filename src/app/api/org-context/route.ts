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

    // 🔥 FIX 1: Explicitly type userData so TS recognizes .id
    const { data: userData, error: userError } = (await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle()) as { data: { id: string } | null; error: any };

    if (userError || !userData) {
      console.log('[org-context] user not found yet:', userError?.message);
      return NextResponse.json({ org: null, role: null });
    }

    // 🔥 FIX 2: Explicitly type membership so TS recognizes .role later
    const { data: membership, error: membershipError } = (await supabase
      .from('organization_memberships')
      .select('role')
      .eq('user_id', userData.id)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .maybeSingle()) as { data: { role: string } | null; error: any };

    if (membershipError || !membership) {
      console.log('[org-context] membership not found yet:', membershipError?.message);
      return NextResponse.json({ org: null, role: null });
    }

    // 🔥 FIX 3: Explicitly type org to ensure smooth JSON serialization
    const { data: org, error: orgError } = (await supabase
      .from('organizations')
      .select('id, name, property_type')
      .eq('id', orgId)
      .maybeSingle()) as { 
        data: { id: string; name: string; property_type: string } | null; 
        error: any 
      };

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

