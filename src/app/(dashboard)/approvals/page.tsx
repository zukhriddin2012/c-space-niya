import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ApprovalsHub } from './ApprovalsHub';
import {
  getPendingApprovalsForGM,
  getPendingPaymentRequestsForApproval,
} from '@/lib/db';
import { supabaseAdmin } from '@/lib/db/connection';

interface TerminationRequestRaw {
  id: string;
  requested_date: string;
  reason: string;
  status: string;
  created_at: string;
  employee: { id: string; full_name: string; employee_id: string; position: string } | null;
  requester: { full_name: string } | null;
}

interface WageChangeRequestRaw {
  id: string;
  wage_type: string;
  current_amount: number;
  proposed_amount: number;
  change_type: string;
  reason: string;
  effective_date: string;
  status: string;
  created_at: string;
  employee: { id: string; full_name: string; employee_id: string; position: string } | null;
  requester: { full_name: string } | null;
  legal_entity: { name: string } | null;
  branch: { name: string } | null;
}

async function getPendingTerminationRequests(limit: number = 10) {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('termination_requests')
    .select(`
      id,
      requested_date,
      reason,
      status,
      created_at,
      employee:employees!employee_id(id, full_name, employee_id, position),
      requester:employees!requested_by(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching termination requests:', error);
    return [];
  }

  // Transform Supabase response to expected format
  return (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    requested_date: item.requested_date as string,
    reason: item.reason as string,
    status: item.status as string,
    created_at: item.created_at as string,
    employee: item.employee as TerminationRequestRaw['employee'],
    requester: item.requester as TerminationRequestRaw['requester'],
  }));
}

async function getPendingWageChangeRequests(limit: number = 10) {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('wage_change_requests')
    .select(`
      id,
      wage_type,
      current_amount,
      proposed_amount,
      change_type,
      reason,
      effective_date,
      status,
      created_at,
      employee:employees!employee_id(id, full_name, employee_id, position),
      requester:employees!requested_by(full_name),
      legal_entity:legal_entities!legal_entity_id(name),
      branch:branches!branch_id(name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wage change requests:', error);
    return [];
  }

  // Transform Supabase response to expected format
  return (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    wage_type: item.wage_type as string,
    current_amount: item.current_amount as number,
    proposed_amount: item.proposed_amount as number,
    change_type: item.change_type as string,
    reason: item.reason as string,
    effective_date: item.effective_date as string,
    status: item.status as string,
    created_at: item.created_at as string,
    employee: item.employee as WageChangeRequestRaw['employee'],
    requester: item.requester as WageChangeRequestRaw['requester'],
    legal_entity: item.legal_entity as WageChangeRequestRaw['legal_entity'],
    branch: item.branch as WageChangeRequestRaw['branch'],
  }));
}

export default async function ApprovalsPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Only managers can access this page
  const allowedRoles = ['general_manager', 'ceo', 'hr', 'chief_accountant'];
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  // Fetch all pending requests
  const [counts, terminationRequestsRaw, wageChangeRequestsRaw, paymentRequestsRaw] = await Promise.all([
    getPendingApprovalsForGM(),
    getPendingTerminationRequests(20),
    getPendingWageChangeRequests(20),
    getPendingPaymentRequestsForApproval(20),
  ]);

  // Transform payment requests to have optional description
  const paymentRequests = paymentRequestsRaw.map(r => ({
    ...r,
    description: r.description ?? null,
  }));

  return (
    <ApprovalsHub
      counts={counts}
      terminationRequests={terminationRequestsRaw}
      wageChangeRequests={wageChangeRequestsRaw}
      paymentRequests={paymentRequests}
    />
  );
}
