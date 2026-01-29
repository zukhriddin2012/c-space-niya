import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// FEEDBACK SUBMISSIONS
// ============================================

export const FEEDBACK_CATEGORIES = [
  { value: 'work_environment', label: 'Work Environment' },
  { value: 'management', label: 'Management & Leadership' },
  { value: 'career', label: 'Career Development' },
  { value: 'compensation', label: 'Compensation & Benefits' },
  { value: 'suggestion', label: 'Suggestion / Idea' },
  { value: 'other', label: 'Other' },
] as const;

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]['value'];
export type FeedbackStatus = 'submitted' | 'read' | 'acknowledged';

export interface FeedbackSubmission {
  id: string;
  employee_id: string;
  is_anonymous: boolean;
  category: FeedbackCategory;
  feedback_text: string;
  rating: number | null;
  status: FeedbackStatus;
  read_by: string | null;
  read_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  response_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined data (only visible if not anonymous)
  employee?: {
    full_name: string;
    employee_id: string;
    position: string;
  };
  reader?: { full_name: string };
  acknowledger?: { full_name: string };
}

export async function createFeedback(data: {
  employee_id: string;
  is_anonymous: boolean;
  category: FeedbackCategory;
  feedback_text: string;
  rating?: number | null;
}): Promise<{ success: boolean; feedback?: FeedbackSubmission; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: feedback, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .insert({
      employee_id: data.employee_id,
      is_anonymous: data.is_anonymous,
      category: data.category,
      feedback_text: data.feedback_text,
      rating: data.rating || null,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating feedback:', error);
    return { success: false, error: error.message };
  }

  return { success: true, feedback };
}

export async function getAllFeedback(status?: FeedbackStatus): Promise<FeedbackSubmission[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('feedback_submissions')
    .select(`
      *,
      employee:employees!feedback_submissions_employee_id_fkey(full_name, employee_id, position),
      reader:employees!feedback_submissions_read_by_fkey(full_name),
      acknowledger:employees!feedback_submissions_acknowledged_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }

  // Hide employee info for anonymous feedback
  return (data || []).map(f => {
    if (f.is_anonymous) {
      return { ...f, employee: undefined };
    }
    return f;
  });
}

export async function getFeedbackById(id: string): Promise<FeedbackSubmission | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select(`
      *,
      employee:employees!feedback_submissions_employee_id_fkey(full_name, employee_id, position),
      reader:employees!feedback_submissions_read_by_fkey(full_name),
      acknowledger:employees!feedback_submissions_acknowledged_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching feedback:', error);
    return null;
  }

  // Hide employee info for anonymous feedback
  if (data && data.is_anonymous) {
    return { ...data, employee: undefined };
  }

  return data;
}

export async function markFeedbackRead(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('feedback_submissions')
    .update({
      status: 'read',
      read_by: userId,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'submitted');

  if (error) {
    console.error('Error marking feedback as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function acknowledgeFeedback(
  id: string,
  userId: string,
  responseNote?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('feedback_submissions')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
      response_note: responseNote || null,
    })
    .eq('id', id)
    .in('status', ['submitted', 'read']);

  if (error) {
    console.error('Error acknowledging feedback:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getMyFeedback(employeeId: string): Promise<FeedbackSubmission[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching my feedback:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadFeedbackCount(): Promise<number> {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const { count, error } = await supabaseAdmin!
    .from('feedback_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  if (error) {
    console.error('Error fetching unread feedback count:', error);
    return 0;
  }

  return count || 0;
}

// Get GM's telegram_id for notifications
export async function getGMTelegramId(): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employees')
    .select('telegram_id')
    .eq('system_role', 'general_manager')
    .eq('status', 'active')
    .not('telegram_id', 'is', null)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching GM telegram ID:', error);
    return null;
  }

  return data?.telegram_id || null;
}
