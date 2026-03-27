import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateOrganizationAccess } from '@/lib/auth-org';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const orgId = req.nextUrl.searchParams.get('org_id');
  const status = req.nextUrl.searchParams.get('status'); // optional: vacant, occupied, maintenance

  if (!orgId) {
    return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
  }

  const hasAccess = await validateOrganizationAccess(orgId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabase
    .from('units')
    .select(`
      *,
      buildings(id, name, address)
    `)
    .eq('buildings.organization_id', orgId);

  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('unit_code');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ units: data });
}

