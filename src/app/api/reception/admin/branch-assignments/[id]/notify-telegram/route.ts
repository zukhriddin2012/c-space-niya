import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';
import { audit, getRequestMeta } from '@/lib/audit';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  temporary: 'Vaqtinchalik / Temporary',
  regular: 'Doimiy / Regular',
  permanent_transfer: "Ko'chirish / Transfer",
};

/**
 * POST /api/reception/admin/branch-assignments/[id]/notify-telegram
 *
 * Sends assignment details to the employee via Telegram, including:
 * - Assignment info (branch, type, period)
 * - Branch password (from branches.reception_password_plain)
 */
export const POST = withAuth(
  async (request: NextRequest, { user, params }) => {
    try {
      const assignmentId = params?.id;
      if (!assignmentId) {
        return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
      }

      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
      }

      // 1. Fetch the assignment with employee + branch data
      const { data: assignment, error: assignmentError } = await supabaseAdmin!
        .from('branch_employee_assignments')
        .select(`
          id, employee_id, assigned_branch_id, assignment_type, starts_at, ends_at,
          employee:employees!branch_employee_assignments_employee_id_fkey(id, full_name, telegram_id),
          assigned_branch:branches!branch_employee_assignments_assigned_branch_id_fkey(id, name, reception_password_plain)
        `)
        .eq('id', assignmentId)
        .is('removed_at', null)
        .single();

      if (assignmentError || !assignment) {
        console.error('Assignment query error:', assignmentError);
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      const employee = assignment.employee as unknown as {
        id: string;
        full_name: string;
        telegram_id: string | null;
      } | null;

      const branch = assignment.assigned_branch as unknown as {
        id: string;
        name: string;
        reception_password_plain: string | null;
      } | null;

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      if (!employee.telegram_id) {
        return NextResponse.json(
          { error: 'Employee is not connected to Telegram' },
          { status: 400 }
        );
      }

      // 2. Build Telegram message
      const branchName = branch?.name || 'N/A';
      const branchPassword = branch?.reception_password_plain || null;
      const typeLabel = ASSIGNMENT_TYPE_LABELS[assignment.assignment_type] || assignment.assignment_type;
      const startsAt = new Date(assignment.starts_at).toLocaleDateString();
      const endsAt = assignment.ends_at
        ? new Date(assignment.ends_at).toLocaleDateString()
        : 'Davomiy / Ongoing';

      let message = `📋 <b>Yangi topshiriq / New Assignment</b>\n\n`;
      message += `👤 <b>Xodim:</b> ${employee.full_name}\n`;
      message += `🏢 <b>Filial:</b> ${branchName}\n`;
      message += `📅 <b>Muddat:</b> ${startsAt} — ${endsAt}\n`;
      message += `🏷 <b>Turi:</b> ${typeLabel}\n\n`;

      if (branchPassword) {
        message += `🔑 <b>Filial paroli:</b> <code>${branchPassword}</code>\n`;
      }
      message += `\n⚠️ Bu ma'lumotlarni maxfiy saqlang.\n`;
      message += `Keep this information secure.`;

      // 3. Send via Telegram
      const telegramResponse = await fetch(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: employee.telegram_id,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      );

      if (!telegramResponse.ok) {
        const telegramError = await telegramResponse.json();
        console.error('Telegram API error:', telegramError);
        return NextResponse.json(
          { error: 'Telegram message failed to send' },
          { status: 502 }
        );
      }

      // 4. Audit
      audit({
        user_id: user.id,
        action: 'assignment.telegram_notified',
        resource_type: 'branch_employee_assignment',
        resource_id: assignmentId,
        details: { employeeId: employee.id, branchName },
        ...getRequestMeta(request),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in notify-telegram:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { roles: ['general_manager'] }
);
