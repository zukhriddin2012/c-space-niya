import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';
import type { User } from '@/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * POST /api/employees/[id]/send-pin-telegram
 *
 * Generates a new 6-digit operator PIN for the employee,
 * stores the hash, and sends the plaintext PIN along with
 * branch name and branch password (auto-fetched) to the employee's Telegram.
 */
export const POST = withAuth(
  async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
    try {
      const { params } = context;
      const employeeId = params?.id;

      if (!employeeId) {
        return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
      }

      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
      }

      // Fetch employee with branch info (including plaintext password)
      const { data: employee, error: fetchError } = await supabaseAdmin!
        .from('employees')
        .select('id, full_name, telegram_id, branch_id, branches!employees_branch_id_fkey(name, reception_password_plain)')
        .eq('id', employeeId)
        .single();

      if (fetchError || !employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      if (!employee.telegram_id) {
        return NextResponse.json(
          { error: 'Employee is not connected to Telegram' },
          { status: 400 }
        );
      }

      // Generate a new random 6-digit PIN
      const pin = String(randomInt(100000, 1000000));

      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 10);

      // Store the hash in the database
      const { error: updateError } = await supabaseAdmin!
        .from('employees')
        .update({ operator_pin_hash: pinHash })
        .eq('id', employeeId);

      if (updateError) {
        console.error('Error updating operator PIN:', updateError);
        return NextResponse.json({ error: 'Failed to update PIN' }, { status: 500 });
      }

      // Build the Telegram message
      const branchData = employee.branches as unknown as { name: string; reception_password_plain: string | null } | null;
      const branchName = branchData?.name || 'N/A';
      const branchPassword = branchData?.reception_password_plain || null;

      let message = `🔐 <b>Your Reception Access Details</b>\n\n`;
      message += `👤 <b>Employee:</b> ${employee.full_name}\n`;
      message += `🏢 <b>Branch:</b> ${branchName}\n`;

      if (branchPassword) {
        message += `🔑 <b>Branch Password:</b> <code>${branchPassword}</code>\n`;
      }

      message += `📟 <b>Your PIN:</b> <code>${pin}</code>\n`;
      message += `\n⚠️ Keep this information secure and do not share it.`;

      // Send via Telegram
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
        // PIN was already updated, but message failed
        return NextResponse.json(
          {
            error: 'PIN was updated but Telegram message failed to send',
            pinUpdated: true,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'PIN generated and sent to Telegram',
      });
    } catch (error) {
      console.error('Error sending PIN to Telegram:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.OPERATOR_PIN_MANAGE }
);
