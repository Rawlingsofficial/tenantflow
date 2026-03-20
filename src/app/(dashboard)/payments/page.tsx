'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Plus } from 'lucide-react'
import { isSameMonth } from 'date-fns'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PaymentsSummary from '@/components/payments/PaymentsSummary'
import PaymentsTable from '@/components/payments/PaymentsTable'
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog'
import type { RentPayment } from '@/types'

interface PaymentWithLease extends RentPayment {
  leases: {
    id: string
    rent_amount: number
    lease_start: string
    tenants: {
      first_name: string | null
      last_name: string | null
      primary_phone: string | null
    } | null
    units: {
      unit_code: string
      buildings: { name: string } | null
    } | null
  } | null
}

interface ActiveLease {
  id: string
  rent_amount: number
  lease_start: string
  tenants: {
    first_name: string | null
    last_name: string | null
    primary_phone: string | null
  } | null
  units: {
    unit_code: string
    buildings: { name: string } | null
  } | null
  rent_payments: {
    amount: number
    payment_date: string
    status: string
  }[]
}

export default function PaymentsPage() {
  const { orgId } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [payments, setPayments] = useState<PaymentWithLease[]>([])
  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>([])
  const [loading, setLoading] = useState(true)
  const [recordDialog, setRecordDialog] = useState(false)
  const [preselectedLeaseId, setPreselectedLeaseId] = useState<string | undefined>()

  useEffect(() => {
    if (orgId) loadAll()
  }, [orgId])

  async function loadAll() {
    setLoading(true)

    const [paymentsRes, leasesRes] = await Promise.all([
      supabase
        .from('rent_payments')
        .select(`
          *,
          leases!inner (
            id, rent_amount, lease_start,
            organization_id,
            tenants ( first_name, last_name, primary_phone ),
            units ( unit_code, buildings ( name ) )
          )
        `)
        .eq('leases.organization_id', orgId!)
        .order('payment_date', { ascending: false }),

      supabase
        .from('leases')
        .select(`
          id, rent_amount, lease_start,
          tenants ( first_name, last_name, primary_phone ),
          units ( unit_code, buildings ( name ) ),
          rent_payments ( amount, payment_date, status )
        `)
        .eq('organization_id', orgId!)
        .eq('status', 'active'),
    ])

    setPayments((paymentsRes.data as PaymentWithLease[]) ?? [])
    setActiveLeases((leasesRes.data as ActiveLease[]) ?? [])
    setLoading(false)
  }

  const now = new Date()

  // Summary stats
  const expectedMonthly = activeLeases.reduce(
    (sum, l) => sum + Number(l.rent_amount), 0
  )

  const collectedThisMonth = activeLeases.reduce((sum, l) => {
    const paid = (l.rent_payments ?? [])
      .filter((p) => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
      .reduce((s, p) => s + Number(p.amount), 0)
    return sum + paid
  }, 0)

  const outstandingBalance = Math.max(0, expectedMonthly - collectedThisMonth)

  const paidTenantsCount = activeLeases.filter((l) => {
    const paid = (l.rent_payments ?? [])
      .filter((p) => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
      .reduce((s, p) => s + Number(p.amount), 0)
    return paid >= Number(l.rent_amount)
  }).length

  // Unpaid leases this month
  const unpaidLeases = activeLeases
    .map((l) => {
      const paidThisMonth = (l.rent_payments ?? [])
        .filter((p) => p.status === 'completed' && isSameMonth(new Date(p.payment_date), now))
        .reduce((s, p) => s + Number(p.amount), 0)
      return { ...l, paidThisMonth }
    })
    .filter((l) => l.paidThisMonth < Number(l.rent_amount))

  // Method breakdown
  const methodBreakdown = ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other'].map((method) => {
    const methodPayments = payments.filter((p) => (p.method ?? 'other') === method && p.status === 'completed')
    return {
      method,
      amount: methodPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      count: methodPayments.length,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track and record rent payments across all your properties
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setPreselectedLeaseId(undefined)
            setRecordDialog(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Record payment
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          <PaymentsSummary
            expectedMonthly={expectedMonthly}
            collectedThisMonth={collectedThisMonth}
            outstandingBalance={outstandingBalance}
            paidTenantsCount={paidTenantsCount}
            totalActiveLeases={activeLeases.length}
            methodBreakdown={methodBreakdown}
          />

          <PaymentsTable
            payments={payments}
            unpaidLeases={unpaidLeases}
            onRecordPayment={() => {
              setPreselectedLeaseId(undefined)
              setRecordDialog(true)
            }}
            onRecordPaymentForLease={(leaseId) => {
              setPreselectedLeaseId(leaseId)
              setRecordDialog(true)
            }}
          />
        </>
      )}

      <RecordPaymentDialog
        open={recordDialog}
        onClose={() => setRecordDialog(false)}
        onSaved={loadAll}
        organizationId={orgId ?? ''}
        preselectedLeaseId={preselectedLeaseId}
      />
    </div>
  )
}

