'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Building2, Phone, Mail, Hash, Receipt,
  FileText, Edit, ChevronRight, MapPin, TrendingUp,
  DollarSign, AlertTriangle, CheckCircle2, Maximize2, Layers
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  )
}

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
    <div className="min-h-screen bg-slate-50/70 p-6 space-y-4">
      <Skeleton className="h-8 w-32 rounded-xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
    </div>
  )

  if (!company) return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Company not found.</p>
    </div>
  )

  const activeLease    = leases.find(l => l.status === 'active')
  const totalInvoiced  = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)
  const overdueCount   = invoices.filter(i => i.status === 'overdue').length
  const monthlyTotal   = activeLease ? Number(activeLease.rent_amount) + Number(activeLease.service_charge ?? 0) : 0
  const initial        = (company.company_name ?? 'C')[0].toUpperCase()

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'leases' as const, label: 'Leases', count: leases.length },
    { key: 'invoices' as const, label: 'Invoices', count: invoices.length },
  ]

  const invoiceStatusConfig: Record<string, string> = {
    paid:    'bg-teal-50 text-teal-700 border border-teal-200',
    overdue: 'bg-red-50 text-red-600 border border-red-200',
    sent:    'bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/20',
    draft:   'bg-slate-100 text-slate-500 border border-slate-200',
    void:    'bg-slate-100 text-slate-400 border border-slate-200',
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-6 pt-5 pb-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => router.push('/companies')}
            className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="hover:text-slate-800 cursor-pointer" onClick={() => router.push('/companies')}>Companies</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-800 font-semibold">{company.company_name}</span>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs border-slate-200 text-slate-600">
          <Edit className="h-3.5 w-3.5" /> Edit Company
        </Button>
      </motion.div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 mb-5"
      >
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          {/* Brand top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#1B3B6F] via-[#2a4f8f] to-[#14b8a6]" />

          <div className="p-6">
            <div className="flex items-start gap-5">
              {/* Logo mark */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B3B6F] to-[#2a4f8f] border border-[#1B3B6F]/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-2xl font-bold text-[#14b8a6]">{initial}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-2">
                  <h1 className="text-xl font-bold text-slate-900">{company.company_name}</h1>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    company.status === 'active'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${company.status === 'active' ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'}`} />
                    {company.status}
                  </span>
                  {company.industry && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B3B6F]/8 text-[#1B3B6F] border border-[#1B3B6F]/15">
                      {company.industry}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {company.company_reg_number && (
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <Hash className="h-3 w-3" />{company.company_reg_number}
                    </span>
                  )}
                  {company.vat_number && (
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <Receipt className="h-3 w-3" />VAT: {company.vat_number}
                    </span>
                  )}
                  {company.primary_phone && (
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <Phone className="h-3 w-3" />{company.primary_phone}
                    </span>
                  )}
                  {company.email && (
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      <Mail className="h-3 w-3" />{company.email}
                    </span>
                  )}
                  {activeLease && (
                    <span className="flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 text-teal-700 font-medium">
                      <Building2 className="h-3 w-3" />
                      {activeLease.units?.unit_code} · {activeLease.units?.buildings?.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Monthly Total', value: monthlyTotal > 0 ? `$${monthlyTotal.toLocaleString()}` : '—', color: 'text-slate-800', icon: DollarSign, bg: 'bg-[#1B3B6F]', iconColor: 'text-[#14b8a6]', accentFrom: 'from-[#1B3B6F]/6' },
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString()}`, color: 'text-slate-800', icon: Receipt, bg: 'bg-slate-100', iconColor: 'text-slate-500', accentFrom: 'from-slate-200/30' },
          { label: 'Total Paid', value: `$${totalPaid.toLocaleString()}`, color: 'text-teal-600', icon: CheckCircle2, bg: 'bg-teal-500/10', iconColor: 'text-teal-600', accentFrom: 'from-teal-500/5' },
          { label: 'Overdue Invoices', value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-slate-400', icon: AlertTriangle, bg: overdueCount > 0 ? 'bg-red-500/10' : 'bg-slate-100', iconColor: overdueCount > 0 ? 'text-red-500' : 'text-slate-400', accentFrom: overdueCount > 0 ? 'from-red-500/5' : 'from-slate-200/20' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
            className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-3.5 overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${s.accentFrom} to-transparent pointer-events-none`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
              </div>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-0.5 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5 pb-10">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Company info */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Company Information</p>
              <InfoRow label="Company Name"      value={company.company_name} />
              <InfoRow label="Registration No."  value={company.company_reg_number} />
              <InfoRow label="VAT Number"        value={company.vat_number} />
              <InfoRow label="Industry"          value={company.industry} />
              <InfoRow label="Company Size"      value={company.company_size ? `${company.company_size} employees` : null} />
              {!company.company_reg_number && !company.vat_number && !company.industry && (
                <p className="text-xs text-slate-400 py-2">No additional info added</p>
              )}
            </div>

            {/* Contact person */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Contact Person</p>
              {company.contact_person ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B3B6F]/8 to-teal-500/8 border border-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#1B3B6F]">{company.contact_person[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{company.contact_person}</p>
                      {company.contact_role && <p className="text-xs text-slate-400">{company.contact_role}</p>}
                    </div>
                  </div>
                  {company.primary_phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />{company.primary_phone}
                    </p>
                  )}
                  {company.email && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />{company.email}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-slate-400">No contact person added</p>}
            </div>

            {/* Current space */}
            {activeLease && (
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Current Space</p>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Space Code',      value: activeLease.units?.unit_code, icon: Layers },
                    { label: 'Building',        value: activeLease.units?.buildings?.name, icon: Building2 },
                    { label: 'Type',            value: activeLease.units?.unit_purpose ?? '—', icon: FileText },
                    { label: 'Area',            value: activeLease.units?.area_sqm ? `${activeLease.units.area_sqm} m²` : '—', icon: Maximize2 },
                    { label: 'Floor',           value: activeLease.units?.floor_number ? `Floor ${activeLease.units.floor_number}` : '—', icon: Layers },
                    { label: 'Rent',            value: `$${Number(activeLease.rent_amount).toLocaleString()}/mo`, icon: DollarSign },
                    { label: 'Service Charge',  value: activeLease.service_charge ? `$${Number(activeLease.service_charge).toLocaleString()}/mo` : 'None', icon: Receipt },
                    { label: 'Lease End',       value: activeLease.lease_end ? format(new Date(activeLease.lease_end), 'MMM d, yyyy') : 'Open-ended', icon: FileText },
                  ].map(row => (
                    <div key={row.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.label}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {company.notes && (
              <div className="col-span-2 bg-amber-50 rounded-2xl border border-amber-200/60 p-4">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{company.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* LEASES */}
        {tab === 'leases' && (
          <div className="space-y-3">
            {leases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No leases found</p>
              </div>
            ) : leases.map((lease, i) => {
              const days = lease.lease_end ? differenceInDays(new Date(lease.lease_end), new Date()) : null
              const leaseStatusConfig: Record<string, string> = {
                active:     'bg-teal-50 text-teal-700 border border-teal-200',
                ended:      'bg-slate-100 text-slate-500 border border-slate-200',
                terminated: 'bg-red-50 text-red-600 border border-red-200',
              }
              return (
                <motion.div
                  key={lease.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/leases/${lease.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        <span className="font-mono">{lease.units?.unit_code}</span> — {lease.units?.buildings?.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(lease.lease_start), 'MMM d, yyyy')} →{' '}
                        {lease.lease_end ? format(new Date(lease.lease_end), 'MMM d, yyyy') : 'Open-ended'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${leaseStatusConfig[lease.status] ?? leaseStatusConfig.ended}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      {lease.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rent</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(lease.rent_amount).toLocaleString()}/mo</p>
                    </div>
                    {lease.service_charge > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service Charge</p>
                        <p className="text-sm font-bold text-slate-900 tabular-nums">${Number(lease.service_charge).toLocaleString()}/mo</p>
                      </div>
                    )}
                    {lease.escalation_rate && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Escalation</p>
                        <p className="text-sm font-bold text-slate-900">{lease.escalation_rate}%/yr</p>
                      </div>
                    )}
                    {days !== null && (
                      <div className={`rounded-xl p-3 border ${
                        days < 0 ? 'bg-red-50 border-red-200' :
                        days < 60 ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-100'
                      }`}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Days Left</p>
                        <p className={`text-sm font-bold tabular-nums ${
                          days < 0 ? 'text-red-600' : days < 60 ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* INVOICES */}
        {tab === 'invoices' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => router.push('/invoices')} size="sm"
                className="bg-[#1B3B6F] hover:bg-[#162d52] text-white rounded-xl text-xs gap-1.5 shadow-sm">
                <Receipt className="h-3.5 w-3.5" /> View All Invoices
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No invoices yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      {['Invoice #', 'Date', 'Due Date', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider first:px-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                      >
                        <td className="px-5 py-3 text-sm font-bold text-[#1B3B6F]">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 tabular-nums">${Number(inv.total_amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${invoiceStatusConfig[inv.status] ?? 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                            {inv.status}
                          </span>
                        </td>
                      </motion.tr>
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


