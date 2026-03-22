'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Phone, Mail, Hash, Receipt, FileText, Edit } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [company, setCompany] = useState<any>(null)
  const [leases, setLeases] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'leases' | 'invoices'>('overview')

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const [cRes, lRes] = await Promise.all([
      (supabase as any).from('tenants').select('*').eq('id', id).single(),
      (supabase as any).from('leases').select(`
        *, units(unit_code, unit_purpose, area_sqm, floor_number, buildings(name, address)),
        rent_payments(id, amount, payment_date, status)
      `).eq('tenant_id', id).order('lease_start', { ascending: false }),
    ])
    setCompany(cRes.data)
    setLeases(lRes.data ?? [])

    const leaseIds = (lRes.data ?? []).map((l: any) => l.id)
    if (leaseIds.length > 0) {
      const { data: invData } = await (supabase as any)
        .from('invoices').select('*').in('lease_id', leaseIds)
        .order('invoice_date', { ascending: false })
      setInvoices(invData ?? [])
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
    </div>
  )

  if (!company) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <p className="text-gray-400 text-sm">Company not found.</p>
    </div>
  )

  const activeLease = leases.find(l => l.status === 'active')
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const monthlyTotal = activeLease
    ? Number(activeLease.rent_amount) + Number(activeLease.service_charge ?? 0)
    : 0

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/companies')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Companies
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">{company.company_name}</span>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs">
          <Edit className="h-3.5 w-3.5" /> Edit Company
        </Button>
      </div>

      {/* Hero */}
      <div className="px-6 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-blue-700">
                {(company.company_name ?? 'C')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{company.company_name}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>{company.status}</span>
                {company.industry && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{company.industry}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {company.company_reg_number && (
                  <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{company.company_reg_number}</span>
                )}
                {company.vat_number && (
                  <span className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />VAT: {company.vat_number}</span>
                )}
                {company.primary_phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{company.primary_phone}</span>
                )}
                {company.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{company.email}</span>
                )}
                {activeLease && (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <Building2 className="h-3.5 w-3.5" />
                    {activeLease.units?.unit_code} · {activeLease.units?.buildings?.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Monthly Total', value: monthlyTotal > 0 ? `$${monthlyTotal.toLocaleString()}` : '—', color: 'text-gray-800' },
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, color: 'text-gray-800' },
          { label: 'Total Paid', value: `$${totalPaid.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Overdue Invoices', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-1 border-b border-gray-200">
        {(['overview', 'leases', 'invoices'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
              tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      <div className="px-6 py-5 pb-10">
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Company Information</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Company Name', value: company.company_name },
                  { label: 'Registration No.', value: company.company_reg_number },
                  { label: 'VAT Number', value: company.vat_number },
                  { label: 'Industry', value: company.industry },
                  { label: 'Company Size', value: company.company_size ? `${company.company_size} employees` : null },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Contact Person</p>
              {company.contact_person ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600">{company.contact_person[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{company.contact_person}</p>
                      {company.contact_role && <p className="text-xs text-gray-400">{company.contact_role}</p>}
                    </div>
                  </div>
                  {company.primary_phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />{company.primary_phone}
                    </p>
                  )}
                  {company.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />{company.email}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-gray-400">No contact person added</p>}
            </div>

            {activeLease && (
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-900 mb-4">Current Space</p>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Space Code', value: activeLease.units?.unit_code },
                    { label: 'Building', value: activeLease.units?.buildings?.name },
                    { label: 'Type', value: activeLease.units?.unit_purpose ?? '—' },
                    { label: 'Area', value: activeLease.units?.area_sqm ? `${activeLease.units.area_sqm} m²` : '—' },
                    { label: 'Floor', value: activeLease.units?.floor_number ? `Floor ${activeLease.units.floor_number}` : '—' },
                    { label: 'Rent', value: `$${Number(activeLease.rent_amount).toLocaleString()}/mo` },
                    { label: 'Service Charge', value: activeLease.service_charge ? `$${Number(activeLease.service_charge).toLocaleString()}/mo` : 'None' },
                    { label: 'Lease End', value: activeLease.lease_end ? format(new Date(activeLease.lease_end), 'MMM d, yyyy') : 'Open-ended' },
                  ].map(row => (
                    <div key={row.label}>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{row.label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {company.notes && (
              <div className="col-span-2 bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-amber-800">{company.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'leases' && (
          <div className="space-y-3">
            {leases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No leases found</p>
              </div>
            ) : leases.map(lease => {
              const days = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
              return (
                <div key={lease.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/leases/${lease.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {lease.units?.unit_code} — {lease.units?.buildings?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(lease.lease_start), 'MMM d, yyyy')} →{' '}
                        {lease.lease_end ? format(new Date(lease.lease_end), 'MMM d, yyyy') : 'Open-ended'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      lease.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>{lease.status}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Rent</p>
                      <p className="text-sm font-bold text-gray-900">${Number(lease.rent_amount).toLocaleString()}/mo</p>
                    </div>
                    {lease.service_charge > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Service Charge</p>
                        <p className="text-sm font-bold text-gray-900">${Number(lease.service_charge).toLocaleString()}/mo</p>
                      </div>
                    )}
                    {lease.escalation_rate && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Escalation</p>
                        <p className="text-sm font-bold text-gray-900">{lease.escalation_rate}%/yr</p>
                      </div>
                    )}
                    {days !== null && (
                      <div className={`rounded-xl p-3 ${days < 0 ? 'bg-red-50' : days < 60 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Days Left</p>
                        <p className={`text-sm font-bold ${days < 0 ? 'text-red-600' : days < 60 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => router.push('/invoices')} size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> View All Invoices
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No invoices yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      {['Invoice #', 'Date', 'Due Date', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide first:px-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                        onClick={() => router.push(`/invoices/${inv.id}`)}>
                        <td className="px-5 py-3 text-sm font-bold text-blue-600">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">${Number(inv.total_amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            inv.status === 'overdue' ? 'bg-red-50 text-red-600 border border-red-200' :
                            inv.status === 'sent' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>{inv.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

