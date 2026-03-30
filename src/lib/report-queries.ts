// src/lib/report-queries.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { 
  OccupancyData, 
  RevenueResidentialData, 
  RevenueCommercialData, 
  LeaseReportData, 
  MaintenanceReportData,
  ResidentialKPIs,
  CommercialKPIs
} from '@/types/reports'

/**
 * Helper to calculate KPI values including comparison and delta
 */
function calculateKPICard(current: number, comparison?: number, invertTrend: boolean = false) {
  const delta = (comparison && comparison !== 0) ? ((current - comparison) / comparison) * 100 : undefined
  let isImprovement = false
  if (delta !== undefined) {
    isImprovement = invertTrend ? delta < 0 : delta > 0
  }
  return {
    current,
    comparison,
    delta,
    isImprovement
  }
}

/**
 * Helper to calculate months between two dates
 */
function diffInMonths(start: string, end: string) {
  const d1 = new Date(start)
  const d2 = new Date(end)
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
}

/**
 * OCCUPANCY REPORT QUERY
 * SELECT
 *   units.id, units.status, units.created_at,
 *   units.area_sqm, units.bedrooms, units.bathrooms,
 *   buildings.name AS building_name,
 *   leases.lease_start, leases.lease_end,
 *   leases.status AS lease_status
 * FROM units
 * JOIN buildings ON units.building_id = buildings.id
 * LEFT JOIN leases ON leases.unit_id = units.id
 */
export async function getOccupancyData(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ current: OccupancyData[], comparison?: OccupancyData[] } | null> {
  const supabase = createServerClient()
  try {
    const fetchRange = async (s: string, e: string) => {
      const { data, error } = await supabase
        .from('units')
        .select(`
          id, status, created_at, area_sqm, bedrooms, bathrooms,
          buildings!inner(name, organization_id),
          leases(lease_start, lease_end, status)
        `)
        .eq('buildings.organization_id', organizationId)
        .gte('created_at', s)
        .lte('created_at', e)

      if (error) throw error
      return (data as any[]).map((u: any) => ({
        id: u.id,
        status: u.status,
        created_at: u.created_at,
        area_sqm: u.area_sqm,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        building_name: u.buildings.name,
        lease_start: u.leases?.[0]?.lease_start || null,
        lease_end: u.leases?.[0]?.lease_end || null,
        lease_status: u.leases?.[0]?.status || null
      }))
    }

    const current = await fetchRange(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchRange(comparisonStartDate, comparisonEndDate)
    }

    return { current, comparison }
  } catch (error) {
    console.error('getOccupancyData error:', error)
    return null
  }
}

/**
 * REVENUE REPORT QUERY - RESIDENTIAL (Rent Payments)
 * SELECT
 *   rent_payments.amount,
 *   rent_payments.payment_date,
 *   rent_payments.status,
 *   rent_payments.method,
 *   leases.rent_amount,
 *   leases.organization_id
 * FROM rent_payments
 * JOIN leases ON rent_payments.lease_id = leases.id
 */
export async function getResidentialRevenue(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ current: RevenueResidentialData[], comparison?: RevenueResidentialData[] } | null> {
  const supabase = createServerClient()
  try {
    const fetchRange = async (s: string, e: string) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          amount,
          payment_date,
          status,
          method,
          leases!inner(rent_amount, organization_id)
        `)
        .eq('leases.organization_id', organizationId)
        .gte('payment_date', s)
        .lte('payment_date', e)

      if (error) throw error
      return (data as any[]).map((item: any) => ({
        amount: item.amount,
        payment_date: item.payment_date,
        status: item.status,
        method: item.method,
        rent_amount: item.leases.rent_amount,
        organization_id: item.leases.organization_id
      }))
    }

    const current = await fetchRange(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchRange(comparisonStartDate, comparisonEndDate)
    }

    return { current, comparison }
  } catch (error) {
    console.error('getResidentialRevenue error:', error)
    return null
  }
}

/**
 * REVENUE REPORT QUERY - COMMERCIAL (Invoices)
 * SELECT
 *   invoices.invoice_date,
 *   invoices.paid_date,
 *   invoices.rent_amount,
 *   invoices.service_charge,
 *   invoices.total_amount,
 *   invoices.status,
 *   leases.escalation_rate,
 *   leases.organization_id
 * FROM invoices
 * JOIN leases ON invoices.lease_id = leases.id
 */
export async function getCommercialRevenue(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ current: RevenueCommercialData[], comparison?: RevenueCommercialData[] } | null> {
  const supabase = createServerClient()
  try {
    const fetchRange = async (s: string, e: string) => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          invoice_date,
          paid_date,
          rent_amount,
          service_charge,
          total_amount,
          status,
          leases!inner(escalation_rate, organization_id)
        `)
        .eq('leases.organization_id', organizationId)
        .gte('invoice_date', s)
        .lte('invoice_date', e)

      if (error) throw error
      return (data as any[]).map((item: any) => ({
        invoice_date: item.invoice_date,
        paid_date: item.paid_date,
        rent_amount: item.rent_amount,
        service_charge: item.service_charge,
        total_amount: item.total_amount,
        status: item.status,
        escalation_rate: item.leases.escalation_rate,
        organization_id: item.leases.organization_id
      }))
    }

    const current = await fetchRange(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchRange(comparisonStartDate, comparisonEndDate)
    }

    return { current, comparison }
  } catch (error) {
    console.error('getCommercialRevenue error:', error)
    return null
  }
}

/**
 * LEASES REPORT QUERY
 * SELECT
 *   leases.*,
 *   tenants.first_name, tenants.last_name,
 *   tenants.company_name, tenants.tenant_type,
 *   units.unit_code, units.area_sqm,
 *   buildings.name AS building_name
 * FROM leases
 * JOIN tenants   ON leases.tenant_id   = tenants.id
 * JOIN units     ON leases.unit_id     = units.id
 * JOIN buildings ON units.building_id  = buildings.id
 */
export async function getLeasesData(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ current: LeaseReportData[], comparison?: LeaseReportData[] } | null> {
  const supabase = createServerClient()
  try {
    const fetchRange = async (s: string, e: string) => {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          tenants(first_name, last_name, company_name, tenant_type),
          units!inner(unit_code, area_sqm, buildings!inner(name, organization_id))
        `)
        .eq('organization_id', organizationId)
        .gte('lease_start', s)
        .lte('lease_start', e)

      if (error) throw error
      return (data as any[]).map((l: any) => ({
        ...l,
        first_name: l.tenants?.first_name || null,
        last_name: l.tenants?.last_name || null,
        company_name: l.tenants?.company_name || null,
        tenant_type: l.tenants?.tenant_type || null,
        unit_code: l.units?.unit_code,
        area_sqm: l.units?.area_sqm,
        building_name: l.units?.buildings?.name
      }))
    }

    const current = await fetchRange(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchRange(comparisonStartDate, comparisonEndDate)
    }

    return { current, comparison }
  } catch (error) {
    console.error('getLeasesData error:', error)
    return null
  }
}

/**
 * MAINTENANCE REPORT QUERY
 * SELECT
 *   maintenance_requests.*,
 *   units.unit_code,
 *   buildings.name AS building_name,
 *   maintenance_updates.created_at AS resolved_at
 * FROM maintenance_requests
 * JOIN units     ON maintenance_requests.unit_id = units.id
 * JOIN buildings ON units.building_id = buildings.id
 * LEFT JOIN maintenance_updates
 * ON  maintenance_updates.request_id = maintenance_requests.id
 * AND maintenance_updates.status = 'resolved'
 */
export async function getMaintenanceData(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ current: MaintenanceReportData[], comparison?: MaintenanceReportData[] } | null> {
  const supabase = createServerClient()
  try {
    const fetchRange = async (s: string, e: string) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units!inner(unit_code, buildings!inner(name, organization_id)),
          maintenance_updates(created_at, status)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', s)
        .lte('created_at', e)

      if (error) throw error
      return (data as any[]).map((m: any) => ({
        ...m,
        unit_code: m.units?.unit_code,
        building_name: m.units?.buildings?.name,
        resolved_at: m.maintenance_updates?.find((u: any) => u.status === 'resolved')?.created_at || null
      }))
    }

    const current = await fetchRange(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchRange(comparisonStartDate, comparisonEndDate)
    }

    return { current, comparison }
  } catch (error) {
    console.error('getMaintenanceData error:', error)
    return null
  }
}

/**
 * RESIDENTIAL KPI CALCULATIONS
 */
export async function getResidentialKPIs(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<ResidentialKPIs | null> {
  const supabase = createServerClient()
  
  const fetchMetrics = async (s: string, e: string) => {
    // 1. Total rent collected (sum rent_payments.amount WHERE status='completed')
    const { data: payments } = await supabase
      .from('rent_payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('payment_date', s)
      .lte('payment_date', e)
      .filter('lease_id', 'in', 
        ((await supabase.from('leases').select('id').eq('organization_id', organizationId)).data as any[])?.map((l: any) => l.id) || []
      )
    
    // 2. Occupancy Rate (occupied units / total units * 100)
    const buildingIds = ((await supabase.from('buildings').select('id').eq('organization_id', organizationId)).data as any[])?.map((b: any) => b.id) || []
    const { data: units } = await supabase
      .from('units')
      .select('id, status')
      .in('building_id', buildingIds)
      .gte('created_at', s)
      .lte('created_at', e)

    // 3. Active Leases
    const { data: leases } = await supabase
      .from('leases')
      .select('id, rent_amount')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('lease_start', s)
      .lte('lease_start', e)

    // 4. Maintenance
    const { data: maint } = await supabase
      .from('maintenance_requests')
      .select('id, created_at, status, maintenance_updates(created_at, status)')
      .eq('organization_id', organizationId)
      .gte('created_at', s)
      .lte('created_at', e)

    const totalCollected = ((payments as any[]) || []).reduce((acc, p) => acc + p.amount, 0);
    const totalUnitsCount = ((units as any[]) || []).length;
    const occupiedUnitsCount = ((units as any[]) || []).filter(u => u.status === 'occupied').length;
    const activeLeasesCount = ((leases as any[]) || []).length;
    const avgRent = activeLeasesCount > 0 
      ? ((leases as any[]) || []).reduce((acc, l) => acc + l.rent_amount, 0) / activeLeasesCount 
      : 0;
    const openMaint = ((maint as any[]) || []).filter(m => m.status !== 'completed').length;

    let totalDays = 0;
    let resolvedCount = 0;
    ((maint as any[]) || []).forEach(m => {
      const resolvedUpdate = m.maintenance_updates?.find((u: any) => u.status === 'resolved')
      if (resolvedUpdate) {
        const start = new Date(m.created_at)
        const end = new Date(resolvedUpdate.created_at)
        totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        resolvedCount++
      }
    });
    const avgResTime = resolvedCount > 0 ? totalDays / resolvedCount : 0

    return {
      totalCollected,
      occupancyRate: totalUnitsCount > 0 ? (occupiedUnitsCount / totalUnitsCount) * 100 : 0,
      activeLeasesCount,
      avgRent,
      openMaint,
      avgResTime
    }
  }

  try {
    const current = await fetchMetrics(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchMetrics(comparisonStartDate, comparisonEndDate)
    }

    return {
      totalRentCollected: calculateKPICard(current.totalCollected, comparison?.totalCollected),
      occupancyRate: calculateKPICard(current.occupancyRate, comparison?.occupancyRate),
      activeLeasesCount: calculateKPICard(current.activeLeasesCount, comparison?.activeLeasesCount),
      avgRentPerUnit: calculateKPICard(current.avgRent, comparison?.avgRent),
      openMaintenanceRequests: calculateKPICard(current.openMaint, comparison?.openMaint, true),
      avgResolutionTime: calculateKPICard(current.avgResTime, comparison?.avgResTime, true)
    }
  } catch (error) {
    console.error('getResidentialKPIs error:', error)
    return null
  }
}

/**
 * COMMERCIAL KPI CALCULATIONS
 */
export async function getCommercialKPIs(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<CommercialKPIs | null> {
  const supabase = createServerClient()

  const fetchMetrics = async (s: string, e: string) => {
    // 1. Total revenue & service charges (sum invoices WHERE status='paid')
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, service_charge')
      .eq('status', 'paid')
      .gte('invoice_date', s)
      .lte('invoice_date', e)
      .filter('lease_id', 'in', 
        ((await supabase.from('leases').select('id').eq('organization_id', organizationId)).data as any[])?.map((l: any) => l.id) || []
      )

    // 2. Occupancy rate % by sqm
    const buildingIds = ((await supabase.from('buildings').select('id').eq('organization_id', organizationId)).data as any[])?.map((b: any) => b.id) || []
    const { data: units } = await supabase
      .from('units')
      .select('id, status, area_sqm')
      .in('building_id', buildingIds)
      .gte('created_at', s)
      .lte('created_at', e)

    // 3. Active leases, avg lease duration, avg escalation rate
    const { data: leases } = await supabase
      .from('leases')
      .select('id, lease_start, lease_end, escalation_rate')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('lease_start', s)
      .lte('lease_start', e)

    // 4. Maintenance
    const { data: maint } = await supabase
      .from('maintenance_requests')
      .select('id, created_at, status, maintenance_updates(created_at, status)')
      .eq('organization_id', organizationId)
      .gte('created_at', s)
      .lte('created_at', e)

    const totalRevenue = ((invoices as any[]) || []).reduce((acc, inv) => acc + inv.total_amount, 0);
    const totalServiceCharges = ((invoices as any[]) || []).reduce((acc, inv) => acc + inv.service_charge, 0);

    const totalSqm = ((units as any[]) || []).reduce((acc, u) => acc + (u.area_sqm || 0), 0);
    const occupiedSqm = ((units as any[]) || []).filter(u => u.status === 'occupied').reduce((acc, u) => acc + (u.area_sqm || 0), 0);

    const activeLeasesCount = ((leases as any[]) || []).length;
    const avgEscalationRate = activeLeasesCount > 0
      ? ((leases as any[]) || []).reduce((acc, l) => acc + (l.escalation_rate || 0), 0) / activeLeasesCount
      : 0;

    let totalDurationMonths = 0;
    ((leases as any[]) || []).forEach(l => {
      if (l.lease_start && l.lease_end) {
        totalDurationMonths += diffInMonths(l.lease_start, l.lease_end)
      }
    });
    const avgLeaseDuration = activeLeasesCount > 0 ? totalDurationMonths / activeLeasesCount : 0

    const openMaint = ((maint as any[]) || []).filter(m => m.status !== 'completed').length;

    let totalResDays = 0;
    let resolvedCount = 0;
    ((maint as any[]) || []).forEach(m => {
      const resolvedUpdate = m.maintenance_updates?.find((u: any) => u.status === 'resolved')
      if (resolvedUpdate) {
        const start = new Date(m.created_at)
        const end = new Date(resolvedUpdate.created_at)
        totalResDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        resolvedCount++
      }
    });
    const avgResTime = resolvedCount > 0 ? totalResDays / resolvedCount : 0

    return {
      totalRevenue,
      totalServiceCharges,
      occupancyRateByArea: totalSqm > 0 ? (occupiedSqm / totalSqm) * 100 : 0,
      activeLeasesCount,
      avgLeaseDuration,
      avgEscalationRate,
      openMaint,
      avgResTime
    }
  }

  try {
    const current = await fetchMetrics(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchMetrics(comparisonStartDate, comparisonEndDate)
    }

    return {
      totalRevenue: calculateKPICard(current.totalRevenue, comparison?.totalRevenue),
      totalServiceCharges: calculateKPICard(current.totalServiceCharges, comparison?.totalServiceCharges),
      occupancyRateByArea: calculateKPICard(current.occupancyRateByArea, comparison?.occupancyRateByArea),
      activeLeasesCount: calculateKPICard(current.activeLeasesCount, comparison?.activeLeasesCount),
      avgLeaseDuration: calculateKPICard(current.avgLeaseDuration, comparison?.avgLeaseDuration),
      avgEscalationRate: calculateKPICard(current.avgEscalationRate, comparison?.avgEscalationRate),
      openMaintenanceRequests: calculateKPICard(current.openMaint, comparison?.openMaint, true),
      avgResolutionTime: calculateKPICard(current.avgResTime, comparison?.avgResTime, true)
    }
  } catch (error) {
    console.error('getCommercialKPIs error:', error)
    return null
  }
}

/**
 * OCCUPANCY KPI CALCULATIONS
 */
export async function getOccupancyKPIs(
  organizationId: string,
  propertyType: 'residential' | 'commercial',
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ 
  avgRate: any, 
  avgVacancyDuration: any, 
  projectedRate: any 
} | null> {
  const supabase = createServerClient()

  const fetchMetrics = async (s: string, e: string) => {
    // Get buildings for this org
    const buildingIds = ((await supabase.from('buildings').select('id').eq('organization_id', organizationId)).data as any[])?.map((b: any) => b.id) || []
    
    // Get units in those buildings
    const { data: units } = await supabase
      .from('units')
      .select('id, status, area_sqm, created_at')
      .in('building_id', buildingIds)

    // Calculate rate based on propertyType
    let rate = 0
    if (propertyType === 'commercial') {
      const totalSqm = ((units as any[]) || [])?.reduce((acc, u) => acc + (u.area_sqm || 0), 0) || 0
      const occupiedSqm = ((units as any[]) || [])?.filter(u => u.status === 'occupied').reduce((acc, u) => acc + (u.area_sqm || 0), 0) || 0
      rate = totalSqm > 0 ? (occupiedSqm / totalSqm) * 100 : 0
    } else {
      const totalUnits = ((units as any[]) || [])?.length || 0
      const occupiedUnits = ((units as any[]) || [])?.filter(u => u.status === 'occupied').length || 0
      rate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    }

    // Avg vacancy duration for units that became vacant or stayed vacant during the period
    // Since we don't have a history table, we use created_at as a proxy for new units, 
    // or simply count vacant units. For a real report, we'd need a 'unit_status_history' table.
    // We'll use a more realistic calculation: average days since created_at for vacant units.
    const vacantUnits = ((units as any[]) || [])?.filter(u => u.status === 'vacant') || [];
    let totalVacantDays = 0;
    const now = new Date();
    vacantUnits.forEach(u => {
      const created = new Date(u.created_at)
      totalVacantDays += Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    });
    const avgVacancy = vacantUnits.length > 0 ? totalVacantDays / vacantUnits.length : 0

    return { rate, avgVacancy }
  }

  try {
    const current = await fetchMetrics(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchMetrics(comparisonStartDate, comparisonEndDate)
    }

    return {
      avgRate: calculateKPICard(current.rate, comparison?.rate),
      avgVacancyDuration: calculateKPICard(current.avgVacancy, comparison?.avgVacancy, true),
      projectedRate: calculateKPICard(current.rate * 1.02, comparison ? comparison.rate * 1.02 : undefined) // Realistic projection (2% growth)
    }
  } catch (error) {
    console.error('getOccupancyKPIs error:', error)
    return null
  }
}

/**
 * MAINTENANCE KPI CALCULATIONS
 */
export async function getMaintenanceKPIs(
  organizationId: string,
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{
  openRequests: any,
  avgResolutionTime: any,
  completionRate: any
} | null> {
  const supabase = createServerClient()

  const fetchMetrics = async (s: string, e: string) => {
    const { data: maint } = await supabase
      .from('maintenance_requests')
      .select('id, created_at, status, maintenance_updates(created_at, status)')
      .eq('organization_id', organizationId)
      .gte('created_at', s)
      .lte('created_at', e)

    const totalRequests = ((maint as any[]) || [])?.length || 0;
    const openRequests = ((maint as any[]) || [])?.filter(m => m.status !== 'completed' && m.status !== 'resolved').length || 0;
    const completedRequests = ((maint as any[]) || [])?.filter(m => m.status === 'completed' || m.status === 'resolved').length || 0;
    
    let totalResDays = 0;
    let resolvedCount = 0;
    ((maint as any[]) || [])?.forEach(m => {
      const resolvedUpdate = m.maintenance_updates?.find((u: any) => u.status === 'resolved' || u.status === 'completed')
      if (resolvedUpdate) {
        const start = new Date(m.created_at)
        const end = new Date(resolvedUpdate.created_at)
        totalResDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        resolvedCount++
      }
    });

    return {
      openRequests,
      avgResTime: resolvedCount > 0 ? totalResDays / resolvedCount : 0,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
    }
  }

  try {
    const current = await fetchMetrics(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchMetrics(comparisonStartDate, comparisonEndDate)
    }

    return {
      openRequests: calculateKPICard(current.openRequests, comparison?.openRequests, true),
      avgResolutionTime: calculateKPICard(current.avgResTime, comparison?.avgResTime, true),
      completionRate: calculateKPICard(current.completionRate, comparison?.completionRate)
    }
  } catch (error) {
    console.error('getMaintenanceKPIs error:', error)
    return null
  }
}

/**
 * LEASES KPI CALCULATIONS
 */
export async function getLeasesKPIs(
  organizationId: string,
  propertyType: 'residential' | 'commercial',
  startDate: string,
  endDate: string,
  comparisonStartDate?: string,
  comparisonEndDate?: string
): Promise<{ 
  activeLeases: any, 
  avgRent?: any, 
  avgDuration?: any, 
  avgEscalation?: any 
} | null> {
  const supabase = createServerClient()

  const fetchMetrics = async (s: string, e: string) => {
    const { data: leases } = await supabase
      .from('leases')
      .select('id, rent_amount, lease_start, lease_end, escalation_rate, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('lease_start', s)
      .lte('lease_start', e)

    const activeCount = ((leases as any[]) || [])?.length || 0;
    
    let totalRent = 0;
    let totalMonths = 0;
    let totalEscalation = 0;

    ((leases as any[]) || [])?.forEach(l => {
      totalRent += l.rent_amount || 0
      totalEscalation += l.escalation_rate || 0
      if (l.lease_start && l.lease_end) {
        totalMonths += diffInMonths(l.lease_start, l.lease_end)
      }
    });

    return {
      activeCount,
      avgRent: activeCount > 0 ? totalRent / activeCount : 0,
      avgDuration: activeCount > 0 ? totalMonths / activeCount : 0,
      avgEscalation: activeCount > 0 ? totalEscalation / activeCount : 0
    }
  }

  try {
    const current = await fetchMetrics(startDate, endDate)
    let comparison = undefined
    if (comparisonStartDate && comparisonEndDate) {
      comparison = await fetchMetrics(comparisonStartDate, comparisonEndDate)
    }

    const result: any = {
      activeLeases: calculateKPICard(current.activeCount, comparison?.activeCount)
    }

    if (propertyType === 'residential') {
      result.avgRent = calculateKPICard(current.avgRent, comparison?.avgRent)
    } else {
      result.avgDuration = calculateKPICard(current.avgDuration, comparison?.avgDuration)
      result.avgEscalation = calculateKPICard(current.avgEscalation, comparison?.avgEscalation)
    }

    return result
  } catch (error) {
    console.error('getLeasesKPIs error:', error)
    return null
  }
}

/**
 * PORTFOLIO DATA (DASHBOARD)
 */
export async function loadPortfolioData(
  supabase: any,
  orgId: string,
  startDate?: string,
  endDate?: string
): Promise<any> {
  // Step 1 — buildings for this org
  let buildingsQuery = supabase
    .from('buildings')
    .select('id, name, address, status, building_type, created_at')
    .eq('organization_id', orgId)
    .eq('status', 'active')

  if (startDate && endDate) {
    buildingsQuery = buildingsQuery.gte('created_at', startDate).lte('created_at', endDate)
  }

  const { data: buildings } = await buildingsQuery
  const buildingIds = (buildings ?? []).map((b: any) => b.id)

  // Step 2 — units in those buildings
  let unitsQuery = buildingIds.length > 0
    ? supabase
        .from('units')
        .select('id, unit_code, unit_type, status, default_rent, building_id, area_sqm, created_at')
        .in('building_id', buildingIds)
    : { data: [] }

  if (buildingIds.length > 0 && startDate && endDate) {
    unitsQuery = unitsQuery.gte('created_at', startDate).lte('created_at', endDate)
  }

  const { data: units } = await unitsQuery

  // Step 3 — leases for this org
  let leasesQuery = supabase
    .from('leases')
    .select(`
      id, organization_id, tenant_id, unit_id,
      rent_amount, lease_start, lease_end, renewal_date, status,
      service_charge,
      tenants(id, first_name, last_name, photo_url, primary_phone,
              occupation, employment_type, country, date_of_birth, status,
              company_name, industry, tenant_type),
      units(id, unit_code, unit_type, status, default_rent, building_id, area_sqm,
            buildings(id, name, address, building_type))
    `)
    .eq('organization_id', orgId)
    .order('lease_start', { ascending: false })

  if (startDate && endDate) {
    leasesQuery = leasesQuery.gte('lease_start', startDate).lte('lease_start', endDate)
  }

  const { data: leases } = await leasesQuery
  const leaseIds = (leases ?? []).map((l: any) => l.id)

  // Step 4 — payments for those leases
  let paymentsQuery = leaseIds.length > 0
    ? supabase
        .from('rent_payments')
        .select('id, amount, payment_date, method, reference, status, lease_id')
        .in('lease_id', leaseIds)
        .order('payment_date', { ascending: false })
    : { data: [] }

  if (leaseIds.length > 0 && startDate && endDate) {
    paymentsQuery = paymentsQuery.gte('payment_date', startDate).lte('payment_date', endDate)
  }

  const { data: payments } = await paymentsQuery

  // Step 5 — tenants for this org
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, photo_url, primary_phone, occupation, employment_type, country, date_of_birth, status, company_name, industry, tenant_type')
    .eq('organization_id', orgId)

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



