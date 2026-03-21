// Shared types for report components
// Import from here, NOT from the page file

export interface LeaseItem {
  id: string
  status: string
  rent_amount: number | string
  lease_start: string
  lease_end?: string | null
  tenant_id?: string
  unit_id?: string
  tenants?: { first_name?: string | null; last_name?: string | null; photo_url?: string | null } | null
  units?: { unit_code?: string; buildings?: { name?: string } | null } | null
}

export interface PaymentItem {
  id: string
  amount: number | string
  payment_date: string
  status: string
  method?: string | null
  reference?: string | null
  lease_id?: string
}

export interface BuildingItem {
  id: string
  name: string
  address?: string | null
}

export interface UnitItem {
  id: string
  unit_code: string
  status: string
  building_id: string
  default_rent?: number | null
  buildings?: { name?: string } | null
}

export interface ReportData {
  // Buildings
  totalBuildings: number
  buildings: BuildingItem[]
  // Units
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  maintenanceUnits: number
  occupancyRate: number
  units: UnitItem[]
  // Leases
  allLeases: LeaseItem[]
  // Payments
  allPayments: PaymentItem[]
  totalCollected: number
  totalExpected: number
  outstanding: number
  collectionRate: number
}
