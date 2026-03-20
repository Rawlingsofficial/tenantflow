'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import TenantProfile from '@/components/tenants/TenantProfile'
import EditTenantDialog from '@/components/tenants/EditTenantDialog'
import AssignTenantDialog from '@/components/tenants/AssignTenantDialog'
import type {
  Tenant, LeaseWithDetails,
  TenantEmergencyContact, TenantDocument
} from '@/types'

export default function TenantProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [leases, setLeases] = useState<LeaseWithDetails[]>([])
  const [contacts, setContacts] = useState<TenantEmergencyContact[]>([])
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [loading, setLoading] = useState(true)

  const [editDialog, setEditDialog] = useState(false)
  const [leaseDialog, setLeaseDialog] = useState(false)

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)

    const [tenantRes, leasesRes, contactsRes, docsRes] = await Promise.all([
      supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single() as any,

      supabase
        .from('leases')
        .select(`
          *,
          tenants ( id, first_name, last_name, email, primary_phone ),
          units (
            id, unit_code, unit_type, bedrooms, bathrooms,
            default_rent, status, building_id,
            buildings ( id, name, address )
          )
        `)
        .eq('tenant_id', id)
        .order('lease_start', { ascending: false }),

      supabase
        .from('tenant_emergency_contacts')
        .select('*')
        .eq('tenant_id', id),

      supabase
        .from('tenant_documents')
        .select('*')
        .eq('tenant_id', id),
    ])

    setTenant(tenantRes.data ?? null)
    setLeases((leasesRes.data as LeaseWithDetails[]) ?? [])
    setContacts((contactsRes.data as TenantEmergencyContact[]) ?? [])
    setDocuments((docsRes.data as TenantDocument[]) ?? [])
    setLoading(false)
  }

  async function handleArchive() {
    if (!tenant) return
    const { data } = await supabase
      .from('tenants')
      .update({ status: 'inactive' })
      .eq('id', tenant.id)
      .select()
      .single() as { data: Tenant | null; error: any }
    if (data) setTenant(data)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>Tenant not found.</p>
      </div>
    )
  }

  return (
    <>
      <TenantProfile
        tenant={tenant}
        leases={leases}
        contacts={contacts}
        documents={documents}
        onEdit={() => setEditDialog(true)}
        onArchive={handleArchive}
        onCreateLease={() => setLeaseDialog(true)}
        onContactsUpdated={setContacts}
        onDocumentsUpdated={setDocuments}
        onTenantUpdated={(updated) => setTenant(updated)}
      />

      <EditTenantDialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        onSaved={(updated) => setTenant(updated)}
        tenant={tenant}
      />

      <AssignTenantDialog
        open={leaseDialog}
        onClose={() => setLeaseDialog(false)}
        onSaved={loadAll}
        unit={null}
        organizationId={orgId ?? ''}
        preselectedTenantId={tenant.id}
      />
    </>
  )
}


