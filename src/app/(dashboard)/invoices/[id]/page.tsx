'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle2, Send, Building2, Phone, Mail, Receipt } from 'lucide-react'
import { format } from 'date-fns'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('invoices')
      .select(`*, leases(*, tenants(*), units(*, buildings(*)))`)
      .eq('id', id).single()
    setInvoice(data)
    setLoading(false)
  }

  async function updateStatus(status: string) {
    await (supabase as any).from('invoices').update({
      status,
      ...(status === 'paid' ? { paid_date: new Date().toISOString().split('T')[0] } : {})
    }).eq('id', id)
    load()
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )

  if (!invoice) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <p className="text-gray-400">Invoice not found.</p>
    </div>
  )

  const lease = invoice.leases
  const tenant = lease?.tenants
  const unit = lease?.units
  const building = unit?.buildings
  const company = tenant?.company_name ?? tenant?.contact_person ?? '—'

  const SC: Record<string, { label: string; color: string; bg: string }> = {
    draft:   { label: 'Draft',   color: 'text-gray-600',    bg: 'bg-gray-100' },
    sent:    { label: 'Sent',    color: 'text-blue-700',    bg: 'bg-blue-50' },
    paid:    { label: 'Paid',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
    overdue: { label: 'Overdue', color: 'text-red-600',     bg: 'bg-red-50' },
    void:    { label: 'Void',    color: 'text-gray-400',    bg: 'bg-gray-100' },
  }
  const sc = SC[invoice.status] ?? SC.draft

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/invoices')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Invoices
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{invoice.invoice_number}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <Button onClick={() => updateStatus('sent')}
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg gap-1.5 px-4">
              <Send className="h-3.5 w-3.5" /> Mark as Sent
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button onClick={() => updateStatus('paid')}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5 px-4">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Paid
            </Button>
          )}
          {!['void', 'paid'].includes(invoice.status) && (
            <Button variant="outline" onClick={() => updateStatus('void')}
              className="h-8 text-xs rounded-lg text-red-500 border-red-200 hover:bg-red-50">
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 pb-10 max-w-3xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Invoice header */}
          <div className="bg-gradient-to-r from-[#1B3B6F] to-[#14b8a6] p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-lg">TenantFlow</span>
                </div>
                <p className="text-white/60 text-xs">Commercial Property Management</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{invoice.invoice_number}</p>
                <p className="text-white/70 text-sm mt-1">TAX INVOICE</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Billed to + Property */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Billed To</p>
                <p className="font-semibold text-gray-900 text-base">{company}</p>
                {tenant?.vat_number && <p className="text-sm text-gray-500 mt-1">VAT: {tenant.vat_number}</p>}
                {tenant?.company_reg_number && <p className="text-sm text-gray-500">Reg: {tenant.company_reg_number}</p>}
                {tenant?.contact_person && tenant?.company_name && (
                  <p className="text-sm text-gray-500">Attn: {tenant.contact_person}{tenant.contact_role ? `, ${tenant.contact_role}` : ''}</p>
                )}
                {tenant?.primary_phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                    <Phone className="h-3 w-3" />{tenant.primary_phone}
                  </p>
                )}
                {tenant?.email && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />{tenant.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Property</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {unit?.unit_code} — {building?.name}
                </p>
                {building?.address && <p className="text-sm text-gray-500 mt-1">{building.address}</p>}
                {unit?.area_sqm && <p className="text-sm text-gray-500">{unit.area_sqm} m²</p>}
                {unit?.floor_number && <p className="text-sm text-gray-500">Floor {unit.floor_number}</p>}
                {unit?.unit_purpose && <p className="text-sm text-gray-500 capitalize">{unit.unit_purpose}</p>}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              {[
                { label: 'Invoice Date', value: format(new Date(invoice.invoice_date), 'MMM d, yyyy') },
                { label: 'Due Date', value: format(new Date(invoice.due_date), 'MMM d, yyyy') },
                { label: 'Paid Date', value: invoice.paid_date ? format(new Date(invoice.paid_date), 'MMM d, yyyy') : '—' },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{r.label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Line items */}
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-3">
                    <p className="text-sm font-medium text-gray-900">
                      Rent — {unit?.unit_code}, {building?.name}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(invoice.invoice_date), 'MMMM yyyy')}</p>
                  </td>
                  <td className="py-3 text-right text-sm font-semibold text-gray-900">
                    ${Number(invoice.rent_amount).toLocaleString()}
                  </td>
                </tr>
                {Number(invoice.service_charge) > 0 && (
                  <tr className="border-b border-gray-50">
                    <td className="py-3">
                      <p className="text-sm font-medium text-gray-900">Service Charge</p>
                      <p className="text-xs text-gray-400">Maintenance & common areas</p>
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-gray-900">
                      ${Number(invoice.service_charge).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-4 text-base font-bold text-gray-900">Total Due</td>
                  <td className="pt-4 text-right text-2xl font-bold text-gray-900">
                    ${Number(invoice.total_amount).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-amber-800">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

