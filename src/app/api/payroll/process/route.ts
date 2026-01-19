import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// POST /api/payroll/process - Process payroll for a month
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { year, month } = await request.json();

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all employee Primary wages (bank - from legal entities)
    const { data: primaryWages, error: primaryWagesError } = await supabaseAdmin!
      .from('employee_wages')
      .select('employee_id, wage_amount, legal_entity_id')
      .eq('is_active', true);

    if (primaryWagesError) {
      console.error('Error fetching primary wages:', primaryWagesError);
      return NextResponse.json({ error: 'Failed to fetch primary wage data' }, { status: 500 });
    }

    // Get all employee Additional wages (cash - from branches)
    const { data: additionalWages, error: additionalWagesError } = await supabaseAdmin!
      .from('employee_branch_wages')
      .select('employee_id, wage_amount, branch_id')
      .eq('is_active', true);

    if (additionalWagesError) {
      console.error('Error fetching additional wages:', additionalWagesError);
      // Don't fail - additional wages are optional
    }

    // Combine all wages into a unified structure
    type WageEntry = {
      employee_id: string;
      wage_amount: number;
      wage_category: 'primary' | 'additional';
      source_id: string;
    };

    const allWages: WageEntry[] = [
      ...(primaryWages || []).map(w => ({
        employee_id: w.employee_id,
        wage_amount: w.wage_amount,
        wage_category: 'primary' as const,
        source_id: w.legal_entity_id,
      })),
      ...(additionalWages || []).map(w => ({
        employee_id: w.employee_id,
        wage_amount: w.wage_amount,
        wage_category: 'additional' as const,
        source_id: w.branch_id,
      })),
    ];

    if (allWages.length === 0) {
      return NextResponse.json({ error: 'No wage data found' }, { status: 400 });
    }

    // Get existing payslips for this month
    const { data: existingPayslips, error: payslipsError } = await supabaseAdmin!
      .from('payslips')
      .select('id, employee_id, status')
      .eq('year', year)
      .eq('month', month);

    if (payslipsError) {
      console.error('Error fetching payslips:', payslipsError);
    }

    // Create a composite key for existing payslips (employee_id + wage_category)
    // Note: payslips table may need wage_category column, but for now we'll handle by employee
    const existingMap = new Map((existingPayslips || []).map(p => [p.employee_id, p]));

    let created = 0;
    let approved = 0;
    let paid = 0;

    // Group wages by employee to aggregate totals
    const employeeWages = new Map<string, { primary: number; additional: number }>();

    for (const wage of allWages) {
      const existing = employeeWages.get(wage.employee_id) || { primary: 0, additional: 0 };
      if (wage.wage_category === 'primary') {
        existing.primary += wage.wage_amount;
      } else {
        existing.additional += wage.wage_amount;
      }
      employeeWages.set(wage.employee_id, existing);
    }

    for (const [employeeId, wages] of employeeWages) {
      const existing = existingMap.get(employeeId);

      // Primary wages: net = wage, gross = net * 1.12, deductions = net * 0.12
      const primaryNet = wages.primary;
      const primaryGross = Math.round(primaryNet * 1.12);
      const primaryDeductions = Math.round(primaryNet * 0.12);

      // Additional wages: no tax, gross = net, deductions = 0
      const additionalNet = wages.additional;

      // Combined totals
      const totalNet = primaryNet + additionalNet;
      const totalGross = primaryGross + additionalNet; // Additional has no tax, so gross = net
      const totalDeductions = primaryDeductions; // Only Primary wages have deductions

      if (existing) {
        // Update existing payslip
        if (existing.status === 'draft') {
          // Draft -> Approved
          await supabaseAdmin!
            .from('payslips')
            .update({
              status: 'approved',
              base_salary: totalGross,
              deductions: totalDeductions,
              net_salary: totalNet,
            })
            .eq('id', existing.id);
          approved++;
        } else if (existing.status === 'approved') {
          // Approved -> Paid
          await supabaseAdmin!
            .from('payslips')
            .update({
              status: 'paid',
              payment_date: today,
            })
            .eq('id', existing.id);
          paid++;
        }
        // Already paid - skip
      } else {
        // Create new payslip as approved
        const { error: insertError } = await supabaseAdmin!
          .from('payslips')
          .insert({
            employee_id: employeeId,
            year,
            month,
            base_salary: totalGross,
            bonuses: 0,
            deductions: totalDeductions,
            net_salary: totalNet,
            status: 'approved',
          });

        if (!insertError) {
          created++;
        } else {
          console.error('Error creating payslip:', insertError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payroll processed: ${created} created, ${approved} approved, ${paid} marked as paid`,
      stats: { created, approved, paid },
    });
  } catch (error) {
    console.error('Error processing payroll:', error);
    return NextResponse.json({ error: 'Failed to process payroll' }, { status: 500 });
  }
}, { permission: PERMISSIONS.PAYROLL_PROCESS });
