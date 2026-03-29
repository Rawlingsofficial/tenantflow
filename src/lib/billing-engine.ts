// src/lib/billing-engine.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { format, startOfMonth, addDays } from 'date-fns';

/**
 * Automatically generates invoices for all active leases in an organization
 * for the current month, if they don't already exist.
 */
export async function generateMonthlyInvoices(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ created: number; skipped: number; errors: any[] }> {
  const errors: any[] = [];
  let created = 0;
  let skipped = 0;

  try {
    // 1. Fetch all active leases for this org
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select(`
        id, rent_amount, service_charge, payment_terms,
        tenants(company_name, first_name, last_name)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (leaseErr) throw leaseErr;
    if (!leases || leases.length === 0) return { created: 0, skipped: 0, errors: [] };

    const today = new Date();
    const monthStr = format(today, 'yyyy-MM'); // e.g. "2026-03"
    const invDate = format(startOfMonth(today), 'yyyy-MM-dd');

    // 2. For each lease, check if invoice already exists for this month
    for (const lease of leases) {
      try {
        const { data: existing, error: existErr } = await supabase
          .from('invoices')
          .select('id')
          .eq('lease_id', lease.id)
          .like('invoice_date', `${monthStr}%`)
          .maybeSingle();

        if (existErr) {
          errors.push({ leaseId: lease.id, error: existErr.message });
          continue;
        }

        if (existing) {
          skipped++;
          continue;
        }

        // 3. Create the invoice
        const rent = Number(lease.rent_amount) || 0;
        const sc = Number(lease.service_charge) || 0;
        const total = rent + sc;
        const terms = Number(lease.payment_terms) || 30;
        const dueDate = format(addDays(new Date(invDate), terms), 'yyyy-MM-dd');
        
        const invNum = `INV-${format(today, 'yyyyMM')}-${lease.id.substring(0, 4).toUpperCase()}`;

        const { error: insErr } = await supabase.from('invoices').insert({
          organization_id: orgId,
          lease_id: lease.id,
          invoice_number: invNum,
          invoice_date: invDate,
          due_date: dueDate,
          rent_amount: rent,
          service_charge: sc,
          total_amount: total,
          status: 'draft',
          notes: 'Auto-generated monthly invoice'
        } as any);

        if (insErr) {
          errors.push({ leaseId: lease.id, error: insErr.message });
        } else {
          created++;
        }
      } catch (e: any) {
        errors.push({ leaseId: lease.id, error: e.message });
      }
    }

    return { created, skipped, errors };
  } catch (err: any) {
    console.error('[BillingEngine] Fatal error:', err);
    return { created, skipped, errors: [err.message] };
  }
}
