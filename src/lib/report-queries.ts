// Centralized data fetching for all report pages
// Uses two-step queries — NO join column filters (they silently fail in Supabase JS)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioData } from '@/types/reports'

export async function loadPortfolioData(
  supabase: SupabaseClient,
  orgId: string
): Promise<PortfolioData> {

  // Step 1 — all buildings for this org
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, address, status')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  const buildingIds = (buildings ?? []).map((b: any) => b.id)

  // Step 2 — all units in those buildings
  const { data: units } = buildingIds.length > 0
    ? await supabase
        .from('units')
        .select('id, unit_code, unit_type, status, default_rent, building_id')
        .in('building_id', buildingIds)
    : { data: [] }

  // Step 3 — all leases for this org (plain eq, no join filter)
  const { data: leases } = await supabase
    .from('leases')
    .select(`
      id, organization_id, tenant_id, unit_id,
      rent_amount, lease_start, lease_end, renewal_date, status,
      tenants(id, first_name, last_name, photo_url, primary_phone,
              occupation, employment_type, country, date_of_birth, status),
      units(id, unit_code, unit_type, status, default_rent, building_id,
            buildings(id, name, address))
    `)
    .eq('organization_id', orgId)
    .order('lease_start', { ascending: false })

  const leaseIds = (leases ?? []).map((l: any) => l.id)

  // Step 4 — all payments for those leases
  const { data: payments } = leaseIds.length > 0
    ? await supabase
        .from('rent_payments')
        .select('id, amount, payment_date, method, reference, status, lease_id')
        .in('lease_id', leaseIds)
        .order('payment_date', { ascending: false })
    : { data: [] }

  // Step 5 — all tenants for this org
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, photo_url, primary_phone, occupation, employment_type, country, date_of_birth, status')
    .eq('organization_id', orgId)

  // Attach building info to units
  const buildingMap = Object.fromEntries((buildings ?? []).map((b: any) => [b.id, b]))
  const enrichedUnits = (units ?? []).map((u: any) => ({
    ...u,
    buildings: buildingMap[u.building_id] ?? null,
  }))

  return {
    buildings: buildings ?? [],
    units: enrichedUnits,
    leases: (leases ?? []) as any[],
    payments: (payments ?? []) as any[],
    tenants: (tenants ?? []) as any[],
  }
}
