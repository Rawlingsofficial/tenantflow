// Central types for all report pages and components
// Source of truth — import ONLY from here

export interface ReportBuilding {
  id: string
  name: string
  address?: string | null
}

export interface ReportUnit {
  id: string
  unit_code: string
  unit_type?: string | null
  status: 'vacant' | 'occupied' | 'maintenance' | string
  default_rent?: number | null
  building_id: string
  buildings?: ReportBuilding | null
  area_sqm?: number   // ✅ added for GLA calculations
}

export interface ReportTenant {
  id: string
  first_name?: string | null
  last_name?: string | null
  photo_url?: string | null
  primary_phone?: string | null
  occupation?: string | null
  employment_type?: string | null
  country?: string | null
  date_of_birth?: string | null
  status: string
  company_name?: string | null   // ✅ added for commercial tenants
  industry?: string | null       // ✅ added for industry analysis
}

export interface ReportPayment {
  id: string
  amount: number
  payment_date: string
  status: string
  method?: string | null
  reference?: string | null
  lease_id: string
}

export interface ReportLease {
  id: string
  organization_id: string
  tenant_id: string
  unit_id: string
  rent_amount: number
  lease_start: string
  lease_end?: string | null
  renewal_date?: string | null
  status: string
  service_charge?: number | null   // ✅ added for NNN/CAM
  // joined
  tenants?: ReportTenant | null
  units?: (ReportUnit & { buildings?: ReportBuilding | null }) | null
}

// The full data bundle loaded once and shared across report pages
export interface PortfolioData {
  buildings: ReportBuilding[]
  units: ReportUnit[]
  leases: ReportLease[]
  payments: ReportPayment[]
  tenants: ReportTenant[]
}

// Legacy aliases (keep for backward compat with existing components)
export type LeaseItem = ReportLease
export type PaymentItem = ReportPayment
export type BuildingItem = ReportBuilding
export type UnitItem = ReportUnit
export type TenantItem = ReportTenant

export interface ReportData {
  tenants: ReportTenant[]
  allLeases: ReportLease[]
  allPayments: ReportPayment[]
  occupancyRate: number
  totalBuildings: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  maintenanceUnits: number
}