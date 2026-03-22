// ─── Database row types ───────────────────────────────────────────────

export type OrgStatus = 'active' | 'inactive'
export type PlanType = 'free' | 'pro' | 'enterprise'
export type Role = 'owner' | 'admin' | 'manager' | 'viewer'
export type Permission = string
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance'
export type LeaseStatus = 'active' | 'ended' | 'terminated'
export type PaymentStatus = 'pending' | 'completed' | 'failed'
export type TenantStatus = 'active' | 'inactive'
export type UserStatus = 'active' | 'inactive'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'

export interface Organization {
  id: string
  name: string
  country: string | null
  plan_type: PlanType
  unit_limit: number
  user_limit: number
  status: OrgStatus
  property_type: string | null
}

export interface OrganizationMembership {
  id: string
  user_id: string
  organization_id: string
  role: Role
  status: OrgStatus
}

export interface User {
  id: string
  clerk_user_id: string
  email: string
  full_name: string | null
  status: UserStatus
  phone: string | null
  username: string | null
}

export interface Building {
  id: string
  organization_id: string
  name: string
  address: string | null
  status: OrgStatus
  photo_url: string | null
  building_type: string | null
}

export interface Unit {
  id: string
  building_id: string
  unit_code: string
  unit_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  default_rent: number | null
  status: UnitStatus
  unit_purpose: string | null
  area_sqm: number | null
  floor_number: number | null
}

export interface Tenant {
  id: string
  organization_id: string
  first_name: string | null
  last_name: string | null
  primary_phone: string | null
  secondary_phone: string | null
  email: string | null
  country: string | null
  date_of_birth: string | null
  marital_status: string | null
  occupation: string | null
  employment_type: string | null
  employer_name: string | null
  work_address: string | null
  notes: string | null
  status: TenantStatus
  photo_url?: string | null
  tenant_type: string | null       // 'individual' | 'company'
  company_name: string | null
  company_reg_number: string | null
  vat_number: string | null
  industry: string | null
  company_size: string | null
  contact_person: string | null
  contact_role: string | null
}

export interface Lease {
  id: string
  organization_id: string
  tenant_id: string
  unit_id: string
  rent_amount: number
  lease_start: string
  lease_end: string | null
  renewal_date: string | null
  status: LeaseStatus
  service_charge: number | null
  escalation_rate: number | null
  break_clause_date: string | null
  payment_terms: number | null
}

export interface RentPayment {
  id: string
  lease_id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  status: PaymentStatus
}

export interface Invoice {
  id: string
  organization_id: string
  lease_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  rent_amount: number
  service_charge: number
  total_amount: number
  status: InvoiceStatus
  paid_date: string | null
  notes: string | null
}

export interface TenantDocument {
  id: string
  tenant_id: string
  document_type: string | null
  file_url: string | null
}

export interface TenantEmergencyContact {
  id: string
  tenant_id: string
  full_name: string | null
  phone: string | null
  relationship: string | null
}

export interface TenantIdentification {
  id: string
  tenant_id: string
  id_type: string | null
  id_number: string | null
  issuing_country: string | null
  expiry_date: string | null
}

export interface Notification {
  id: string
  organization_id: string
  user_id: string | null
  type: string | null
  message: string | null
  is_read: boolean
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

// ─── Joined / enriched types (for UI) ────────────────────────────────

export interface UnitWithBuilding extends Unit {
  buildings: Pick<Building, 'id' | 'name' | 'address'>
}

export interface LeaseWithDetails extends Lease {
  tenants: Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email' | 'primary_phone' | 'tenant_type' | 'company_name'>
  units: UnitWithBuilding
}

export interface TenantWithLease extends Tenant {
  leases: LeaseWithDetails[]
}

// ─── Dashboard stats type ─────────────────────────────────────────────

export interface DashboardStats {
  totalBuildings: number
  totalUnits: number
  vacantUnits: number
  occupiedUnits: number
  activeTenants: number
  expiringLeases: number
  activeLeases: number
  occupancyRate: number            // ← added
  expectedMonthly: number
  collectedThisMonth: number
  outstandingBalance: number
}

// ─── Supabase Database type (used by client/server) ───────────────────

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: {
          name: string
          country?: string | null
          plan_type?: string
          unit_limit?: number
          user_limit?: number
          status?: OrgStatus
          property_type?: string | null
        }
        Update: Partial<Organization>
      }
      organization_memberships: {
        Row: OrganizationMembership
        Insert: {
          user_id: string
          organization_id: string
          role: Role
          status?: OrgStatus
        }
        Update: Partial<OrganizationMembership>
      }
      users: {
        Row: User
        Insert: {
          clerk_user_id: string
          email: string
          full_name?: string | null
          status?: UserStatus
          phone?: string | null
          username?: string | null
        }
        Update: Partial<User>
      }
      buildings: {
        Row: Building
        Insert: {
          organization_id: string
          name: string
          address?: string | null
          status?: OrgStatus
          photo_url?: string | null
          building_type?: string | null
        }
        Update: Partial<Building>
      }
      units: {
        Row: Unit
        Insert: {
          building_id: string
          unit_code: string
          unit_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          default_rent?: number | null
          status?: UnitStatus
          unit_purpose?: string | null
          area_sqm?: number | null
          floor_number?: number | null
        }
        Update: Partial<Unit>
      }
      tenants: {
        Row: Tenant
        Insert: {
          organization_id: string
          first_name?: string | null
          last_name?: string | null
          primary_phone?: string | null
          secondary_phone?: string | null
          email?: string | null
          country?: string | null
          date_of_birth?: string | null
          marital_status?: string | null
          occupation?: string | null
          employment_type?: string | null
          employer_name?: string | null
          work_address?: string | null
          notes?: string | null
          status?: TenantStatus
          photo_url?: string | null
          tenant_type?: string | null
          company_name?: string | null
          company_reg_number?: string | null
          vat_number?: string | null
          industry?: string | null
          company_size?: string | null
          contact_person?: string | null
          contact_role?: string | null
        }
        Update: Partial<Tenant>
      }
      leases: {
        Row: Lease
        Insert: {
          organization_id: string
          tenant_id: string
          unit_id: string
          rent_amount: number
          lease_start: string
          lease_end?: string | null
          renewal_date?: string | null
          status?: LeaseStatus
          service_charge?: number | null
          escalation_rate?: number | null
          break_clause_date?: string | null
          payment_terms?: number | null
        }
        Update: Partial<Lease>
      }
      invoices: {
        Row: Invoice
        Insert: {
          organization_id: string
          lease_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          rent_amount: number
          service_charge: number
          total_amount: number
          status?: InvoiceStatus
          paid_date?: string | null
          notes?: string | null
        }
        Update: Partial<Invoice>
      }
      rent_payments: {
        Row: RentPayment
        Insert: {
          lease_id: string
          amount: number
          payment_date: string
          method?: string | null
          reference?: string | null
          status?: PaymentStatus
        }
        Update: Partial<RentPayment>
      }
      tenant_documents: {
        Row: TenantDocument
        Insert: {
          tenant_id: string
          document_type?: string | null
          file_url?: string | null
        }
        Update: Partial<TenantDocument>
      }
      tenant_emergency_contacts: {
        Row: TenantEmergencyContact
        Insert: {
          tenant_id: string
          full_name?: string | null
          phone?: string | null
          relationship?: string | null
        }
        Update: Partial<TenantEmergencyContact>
      }
      tenant_identifications: {
        Row: TenantIdentification
        Insert: {
          tenant_id: string
          id_type?: string | null
          id_number?: string | null
          issuing_country?: string | null
          expiry_date?: string | null
        }
        Update: Partial<TenantIdentification>
      }
      notifications: {
        Row: Notification
        Insert: {
          organization_id: string
          user_id?: string | null
          type?: string | null
          message?: string | null
          is_read?: boolean
        }
        Update: Partial<Notification>
      }
      audit_logs: {
        Row: AuditLog
        Insert: {
          organization_id: string
          user_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
        }
        Update: Partial<AuditLog>
      }
    }
  }
}
