// src/types/reports.ts
import { 
  Lease, MaintenanceRequest 
} from './index'

/**
 * DATE RANGE & COMPARISON STATE
 */
export type DateRangePreset = 
  | 'last_30_days' 
  | 'last_3_months' 
  | 'last_6_months' 
  | 'last_12_months' 
  | 'this_year' 
  | 'last_year' 
  | 'all_time' 
  | 'custom'

export interface DateRangeState {
  preset: DateRangePreset
  startDate: string // ISO
  endDate: string   // ISO
}

export type ComparisonType = 'previous_period' | 'same_period_last_year' | 'custom' | 'none'

export interface ComparisonState {
  enabled: boolean
  type: ComparisonType
  startDate?: string
  endDate?: string
}

/**
 * QUERY RESULT TYPES (Canonical Queries)
 */

export interface OccupancyData {
  id: string
  status: string
  created_at: string
  area_sqm: number | null
  bedrooms: number | null
  bathrooms: number | null
  building_name: string
  lease_start: string | null
  lease_end: string | null
  lease_status: string | null
}

export interface RevenueResidentialData {
  amount: number
  payment_date: string
  status: string
  method: string | null
  rent_amount: number
  organization_id: string
}

export interface RevenueCommercialData {
  invoice_date: string
  paid_date: string | null
  rent_amount: number
  service_charge: number
  total_amount: number
  status: string
  escalation_rate: number | null
  organization_id: string
}

export interface LeaseReportData extends Lease {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  tenant_type: string | null
  unit_code: string
  area_sqm: number | null
  building_name: string
}

export interface MaintenanceReportData extends MaintenanceRequest {
  unit_code: string
  building_name: string
  resolved_at: string | null
}

/**
 * KPI CARD DATA
 */

export interface KPICardValue {
  current: number
  comparison?: number
  delta?: number // percentage
  isImprovement?: boolean
}

export interface ResidentialKPIs {
  totalRentCollected: KPICardValue
  occupancyRate: KPICardValue
  activeLeasesCount: KPICardValue
  avgRentPerUnit: KPICardValue
  openMaintenanceRequests: KPICardValue
  avgResolutionTime: KPICardValue
}

export interface CommercialKPIs {
  totalRevenue: KPICardValue
  totalServiceCharges: KPICardValue
  occupancyRateByArea: KPICardValue
  activeLeasesCount: KPICardValue
  avgLeaseDuration: KPICardValue
  avgEscalationRate: KPICardValue
  openMaintenanceRequests: KPICardValue
  avgResolutionTime: KPICardValue
}

export interface PortfolioData {
  buildings: any[]
  units: any[]
  leases: any[]
  payments: any[]
  tenants: any[]
}
