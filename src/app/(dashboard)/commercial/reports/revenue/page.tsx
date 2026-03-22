'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, TrendingUp, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export default function CommercialRevenueReportPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const [iRes, lRes] = await Promise.all([
      (supabase as any).from('invoices')
        .select(`*, leases(rent_amount, service_charge, tenants(company_name, contact_person), units(unit_code, buildings(name)))`)
        .eq('organization_id', orgId!)
        .order('invoice_date', { ascending: false }),
      (supabase as any).from('leases')
        .select('id, status, rent_amount, service_charge')
        .eq('organization_id', orgId!).eq('status', 'active'),
    ])
    setInvoices(iRes.data ?? [])
    setLeases(lRes.data ?? [])
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  )

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(new Date(), 11 - i)
    const ms = format(m, 'yyyy-MM')
    const invoiced = invoices.filter(inv => inv.invoice_date?.startsWith(ms)).reduce((s, inv) => s + Number(inv.total_amount), 0)
    const collected = invoices.filter(inv => inv.status === 'paid' && inv.invoice_date?.startsWith(ms)).reduce((s, inv) => s + Number(inv.total_amount), 0)
    const overdue = invoices.filter(inv => inv.status === 'overdue' && inv.invoice_date?.startsWith(ms)).reduce((s, inv) => s + Number(inv.total_amount), 0)
    return { label: format(m, 'MMM yy'), invoiced, collected, overdue }
  })

  const maxVal = Math.max(...monthly.map(m => m.invoiced), 1)
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount), 0)
  const monthlyExpected = leases.reduce((s, l) => s + Number(l.rent_amount) + Number(l.service_charge ?? 0), 0)
  const thisMonthStr = format(new Date(), 'yyyy-MM')
  const thisMonthCollected = invoices.filter(i => i.status === 'paid' && i.invoice_date?.startsWith(thisMonthStr)).reduce((s, i) => s + Number(i.total_amount), 0)
  const collectionRate = monthlyExpected > 0 ? Math.round((thisMonthCollected / monthlyExpected) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.push('/commercial/reports')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Reports
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">Revenue & Invoices</h1>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, color: 'text-gray-800', icon: Receipt },
          { label: 'Total Collected', value: `$${totalCollected.toLocaleString()}`, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Overdue', value: `$${totalOverdue.toLocaleString()}`, color: totalOverdue > 0 ? 'text-red-600' : 'text-gray-400', icon: AlertCircle },
          { label: 'This Month Rate', value: `${collectionRate}%`, color: collectionRate >= 80 ? 'text-emerald-600' : 'text-amber-600', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-start justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <s.icon className="h-5 w-5 text-gray-200 mt-1" />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">Monthly Revenue — Last 12 Months</p>
          <p className="text-xs text-gray-400 mb-4">Invoiced vs Collected</p>
          <div className="flex items-end gap-2 h-36">
            {monthly.map((m, i) => {
              const invoicedH = (m.invoiced / maxVal) * 100
              const collectedH = (m.collected / maxVal) * 100
              const isCurrent = i === monthly.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end gap-0.5 h-28">
                    <div className="flex-1 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(invoicedH, 3)}%`, background: isCurrent ? '#1B3B6F' : '#bfdbfe', minHeight: '3px' }} />
                    <div className="flex-1 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(collectedH, 3)}%`, background: isCurrent ? '#14b8a6' : '#a7f3d0', minHeight: '3px' }} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">{m.label}</p>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-200" /><span className="text-xs text-gray-500">Invoiced</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-200" /><span className="text-xs text-gray-500">Collected</span></div>
          </div>
        </div>
      </div>

      {/* Invoice breakdown table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">All Invoices</p>
            <span className="text-xs text-gray-400">{invoices.length} total</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['Invoice #', 'Company', 'Space', 'Amount', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 50).map(inv => {
                const co = inv.leases?.tenants?.company_name ?? inv.leases?.tenants?.contact_person ?? '—'
                return (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                    <td className="px-5 py-3 text-sm font-bold text-blue-600">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{co}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{inv.leases?.units?.unit_code ?? '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">${Number(inv.total_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        inv.status === 'overdue' ? 'bg-red-50 text-red-600 border border-red-200' :
                        inv.status === 'sent' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>{inv.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


