'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Receipt, CheckCircle2, Clock, AlertCircle, XCircle, Send } from 'lucide-react'
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog'
import { usePropertyType } from '@/hooks/usePropertyType'
import { format } from 'date-fns'

type Tab = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

const STATUS: Record<string, { icon: any; label: string; cls: string }> = {
  draft:   { icon: Clock,         label: 'Draft',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  sent:    { icon: Send,          label: 'Sent',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:    { icon: CheckCircle2,  label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  overdue: { icon: AlertCircle,   label: 'Overdue', cls: 'bg-red-50 text-red-600 border-red-200' },
  void:    { icon: XCircle,       label: 'Void',    cls: 'bg-gray-100 text-gray-400 border-gray-200' },
}

export default function InvoicesPage() {
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { propertyType } = usePropertyType()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => { if (orgId) load() }, [orgId, propertyType])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('invoices')
      .select(`*, leases(rent_amount, service_charge, tenant_id, unit_id,
        tenants(company_name, contact_person, tenant_type),
        units(unit_code, area_sqm, buildings(name, building_type)))`)
      .eq('organization_id', orgId!)
      .order('invoice_date', { ascending: false })

    const result = data ?? []

    setInvoices(result)
    setLoading(false)
  }

  async function quickUpdate(id: string, status: string, e: React.MouseEvent) {
    e.stopPropagation()
    await (supabase as any).from('invoices').update({
      status,
      ...(status === 'paid' ? { paid_date: new Date().toISOString().split('T')[0] } : {})
    }).eq('id', id)
    load()
  }

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const co = inv.leases?.tenants?.company_name ?? inv.leases?.tenants?.contact_person ?? ''
    const match = !q || co.toLowerCase().includes(q) ||
      (inv.leases?.units?.unit_code ?? '').toLowerCase().includes(q) ||
      (inv.invoice_number ?? '').toLowerCase().includes(q)
    if (!match) return false
    return tab === 'all' || inv.status === tab
  })

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total_amount), 0)
  const counts: Record<Tab, number> = {
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ${totalPaid.toLocaleString()} collected · ${totalOverdue.toLocaleString()} overdue
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg gap-1.5 px-4">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, color: 'text-gray-800' },
          { label: 'Collected', value: `$${totalPaid.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${(totalInvoiced - totalPaid).toLocaleString()}`, color: 'text-amber-600' },
          { label: 'Overdue', value: counts.overdue, color: counts.overdue > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-1">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize flex items-center gap-1.5 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="relative pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input placeholder="Search invoices..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs bg-white border-gray-200 rounded-lg" />
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No invoices found</p>
              <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search' : 'Create your first invoice'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Invoice #', 'Company', 'Space', 'Amount', 'Invoice Date', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                  ))}
                 </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const co = inv.leases?.tenants?.company_name ?? inv.leases?.tenants?.contact_person ?? '—'
                  const sc = STATUS[inv.status] ?? STATUS.draft
                  const Icon = sc.icon
                  return (
                    <tr key={inv.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-blue-600">{inv.invoice_number}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700">{co[0]?.toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{co}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{inv.leases?.units?.unit_code ?? '—'}</p>
                        <p className="text-[11px] text-gray-400">
                          {inv.leases?.units?.buildings?.name ?? '—'}
                          {inv.leases?.units?.area_sqm ? ` · ${inv.leases.units.area_sqm}m²` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-gray-900">${Number(inv.total_amount).toLocaleString()}</p>
                        {Number(inv.service_charge) > 0 && (
                          <p className="text-[11px] text-gray-400">
                            Rent ${Number(inv.rent_amount).toLocaleString()} + SC ${Number(inv.service_charge).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {format(new Date(inv.invoice_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {format(new Date(inv.due_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                          <Icon className="h-3 w-3" />{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          {inv.status === 'draft' && (
                            <button onClick={e => quickUpdate(inv.id, 'sent', e)}
                              className="text-[10px] text-blue-600 font-semibold hover:underline">Send</button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button onClick={e => quickUpdate(inv.id, 'paid', e)}
                              className="text-[10px] text-emerald-600 font-semibold hover:underline">Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateInvoiceDialog open={createOpen} onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); load() }} />
    </div>
  )
}