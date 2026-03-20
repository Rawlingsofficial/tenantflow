'use client'

import { useState } from 'react'
import {
  Search, CheckCircle2, Download,
  CreditCard, Smartphone, Building2,
  FileCheck, HelpCircle, XCircle, AlertCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { format, isSameMonth } from 'date-fns'
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

interface UnpaidLease {
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
  paidThisMonth: number
}

interface Props {
  payments: PaymentWithLease[]
  unpaidLeases: UnpaidLease[]
  onRecordPayment: () => void
  onRecordPaymentForLease: (leaseId: string) => void
}

const methodIcons: Record<string, any> = {
  cash: CreditCard,
  bank_transfer: Building2,
  mobile_money: Smartphone,
  cheque: FileCheck,
  other: HelpCircle,
}

function exportToCSV(payments: PaymentWithLease[]) {
  const headers = ['Date', 'Month', 'Tenant', 'Unit', 'Building', 'Amount', 'Method', 'Reference', 'Status']
  const rows = payments.map((p) => {
    const name = `${p.leases?.tenants?.first_name ?? ''} ${p.leases?.tenants?.last_name ?? ''}`.trim()
    return [
      format(new Date(p.payment_date), 'dd MMM yyyy'),
      format(new Date(p.payment_date), 'MMMM yyyy'),
      name,
      p.leases?.units?.unit_code ?? '',
      p.leases?.units?.buildings?.name ?? '',
      p.amount,
      p.method ?? '',
      p.reference ?? '',
      p.status,
    ]
  })

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payments_${format(new Date(), 'yyyy_MM_dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type Tab = 'all' | 'unpaid'

export default function PaymentsTable({
  payments, unpaidLeases, onRecordPayment, onRecordPaymentForLease
}: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')

  const months = Array.from(
    new Set(payments.map((p) => format(new Date(p.payment_date), 'yyyy-MM')))
  ).sort((a, b) => b.localeCompare(a))

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase()
    const name = `${p.leases?.tenants?.first_name ?? ''} ${p.leases?.tenants?.last_name ?? ''}`.toLowerCase()
    const unit = p.leases?.units?.unit_code?.toLowerCase() ?? ''
    const building = p.leases?.units?.buildings?.name?.toLowerCase() ?? ''
    const ref = p.reference?.toLowerCase() ?? ''
    const matchSearch = !q || name.includes(q) || unit.includes(q) || building.includes(q) || ref.includes(q)
    const matchMethod = methodFilter === 'all' || p.method === methodFilter
    const matchMonth = monthFilter === 'all' || p.payment_date.startsWith(monthFilter)
    return matchSearch && matchMethod && matchMonth
  })

  const filteredUnpaid = unpaidLeases.filter((l) => {
    const q = search.toLowerCase()
    const name = `${l.tenants?.first_name ?? ''} ${l.tenants?.last_name ?? ''}`.toLowerCase()
    const unit = l.units?.unit_code?.toLowerCase() ?? ''
    const building = l.units?.buildings?.name?.toLowerCase() ?? ''
    return !q || name.includes(q) || unit.includes(q) || building.includes(q)
  })

  if (payments.length === 0 && unpaidLeases.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">No payments recorded yet</p>
        <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={onRecordPayment}>
          Record first payment
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('all')}
        >
          All payments ({payments.length})
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === 'unpaid'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('unpaid')}
        >
          {unpaidLeases.length > 0 && (
            <span className="h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unpaidLeases.length}
            </span>
          )}
          Unpaid this month
        </button>
      </div>

      {/* Filters — only for all payments tab */}
      {tab === 'all' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tenant, unit, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(new Date(m + '-01'), 'MMMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              <SelectItem value="mobile_money">Mobile money</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="shrink-0" onClick={() => exportToCSV(filtered)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Unpaid search */}
      {tab === 'unpaid' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tenant, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* ── ALL PAYMENTS TABLE ── */}
      {tab === 'all' && (
        <>
          <p className="text-xs text-slate-400">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-medium text-slate-600">
              {filtered.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
            </span>{' '}
            total
          </p>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Tenant</TableHead>
                  <TableHead className="text-xs">Unit / Building</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-10 text-sm">
                      No payments match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((payment) => {
                    const tenantName = `${payment.leases?.tenants?.first_name ?? ''} ${payment.leases?.tenants?.last_name ?? ''}`.trim()
                    const MethodIcon = methodIcons[payment.method ?? 'other'] ?? HelpCircle
                    return (
                      <TableRow key={payment.id} className="hover:bg-slate-50 bg-white">
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">
                            {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(payment.payment_date), 'MMMM yyyy')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                              {tenantName[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {tenantName || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">
                            {payment.leases?.units?.unit_code ?? '—'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {payment.leases?.units?.buildings?.name ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-bold text-emerald-700">
                            {Number(payment.amount).toLocaleString()}
                          </p>
                          {payment.leases && Number(payment.amount) < Number(payment.leases.rent_amount) && (
                            <p className="text-xs text-amber-500">
                              Partial · {Number(payment.leases.rent_amount).toLocaleString()} expected
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MethodIcon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600 capitalize">
                              {payment.method?.replace('_', ' ') ?? '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {payment.reference ?? <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            payment.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : payment.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                          }`}>
                            <CheckCircle2 className="h-3 w-3" />
                            {payment.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── UNPAID THIS MONTH TABLE ── */}
      {tab === 'unpaid' && (
        <>
          <p className="text-xs text-slate-400">
            {filteredUnpaid.length} tenant{filteredUnpaid.length !== 1 ? 's' : ''} unpaid ·{' '}
            <span className="font-medium text-red-500">
              {filteredUnpaid.reduce((sum, l) => sum + Number(l.rent_amount) - l.paidThisMonth, 0).toLocaleString()}
            </span>{' '}
            outstanding
          </p>

          {filteredUnpaid.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600">
                All tenants have paid this month!
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Tenant</TableHead>
                    <TableHead className="text-xs">Unit / Building</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Expected</TableHead>
                    <TableHead className="text-xs">Paid so far</TableHead>
                    <TableHead className="text-xs">Outstanding</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnpaid.map((lease) => {
                    const tenantName = `${lease.tenants?.first_name ?? ''} ${lease.tenants?.last_name ?? ''}`.trim()
                    const outstanding = Number(lease.rent_amount) - lease.paidThisMonth

                    return (
                      <TableRow key={lease.id} className="hover:bg-slate-50 bg-white">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                              {tenantName[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {tenantName || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">
                            {lease.units?.unit_code ?? '—'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {lease.units?.buildings?.name ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {lease.tenants?.primary_phone ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {Number(lease.rent_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {lease.paidThisMonth > 0 ? (
                            <span className="text-sm text-amber-600 font-medium">
                              {lease.paidThisMonth.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-red-600">
                            {outstanding.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => onRecordPaymentForLease(lease.id)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

