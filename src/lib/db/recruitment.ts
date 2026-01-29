import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// CANDIDATES (Recruitment Pipeline)
// ============================================

export type CandidateStage = 'screening' | 'interview_1' | 'interview_2' | 'under_review' | 'probation' | 'hired' | 'rejected';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  iq_score: number | null;
  mbti_type: string | null;
  applied_role: string;
  about: string | null;
  resume_file_name: string | null;
  resume_file_path: string | null;
  resume_file_size: number | null;
  stage: CandidateStage;
  probation_employee_id: string | null;
  probation_start_date: string | null;
  probation_end_date: string | null;
  checklist: ChecklistItem[];
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
  // New fields for deadlines and tracking
  next_event_at: string | null;
  next_event_title: string | null;
  term_sheet_signed: boolean;
  probation_account_created: boolean;
  comment_count: number;
  // AI Analysis
  ai_analysis: AIAnalysis | null;
  ai_analyzed_at: string | null;
  // Joined
  probation_employee?: { full_name: string; employee_id: string };
}

// AI Analysis result structure
export interface AIAnalysis {
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  experience: {
    total_years: number;
    companies: {
      name: string;
      role: string;
      duration: string;
      highlights: string[];
    }[];
  };
  education: {
    degree: string;
    institution: string;
    year: string;
    field: string;
  }[];
  role_fit: {
    score: number;
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };
  values_fit?: {
    overall_score: number;
    do_the_right_thing: { score: number; evidence: string };
    all_in: { score: number; evidence: string };
    innovate: { score: number; evidence: string };
    radical_transparency: { score: number; evidence: string };
    architects_not_firefighters: { score: number; evidence: string };
    culture_recommendation: string;
  };
  red_flags: string[];
  interview_questions: {
    question: string;
    purpose: string;
  }[];
  company_research: {
    company: string;
    industry: string;
    insights: string;
  }[];
  analyzed_at: string;
}

// Comment on a candidate
export interface CandidateComment {
  id: string;
  candidate_id: string;
  user_id: string;
  content: string;
  stage_tag: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { full_name: string; email: string };
}

// Event for a candidate (interview, meeting, deadline)
export interface CandidateEvent {
  id: string;
  candidate_id: string;
  title: string;
  event_type: 'interview' | 'meeting' | 'deadline' | 'review' | 'signing' | 'other';
  scheduled_at: string;
  completed_at: string | null;
  with_user_id: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  with_user?: { full_name: string };
}

// Default checklist items for probation
const DEFAULT_PROBATION_CHECKLIST: ChecklistItem[] = [
  { id: '1', text: 'Create Term Sheet', completed: false, required: true },
  { id: '2', text: 'Sign Term Sheet', completed: false, required: true },
  { id: '3', text: 'Create temporary employee account', completed: false, required: true },
  { id: '4', text: 'Setup workspace/equipment', completed: false, required: false },
];

// Additional checklist items for Community Manager role
const CM_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'cm1', text: 'Week 1: Platform familiarization', completed: false, required: true },
  { id: 'cm2', text: 'Week 1: Review community guidelines', completed: false, required: true },
  { id: 'cm3', text: 'Week 2: Supervised community engagement', completed: false, required: true },
  { id: 'cm4', text: 'Week 2: Complete CM program assessment', completed: false, required: true },
];

function getProbationChecklist(role: string): ChecklistItem[] {
  const checklist = [...DEFAULT_PROBATION_CHECKLIST];

  // Add CM-specific items if role matches
  if (role.toLowerCase().includes('community manager') || role.toLowerCase() === 'cm') {
    checklist.push(...CM_CHECKLIST_ITEMS);
  }

  return checklist;
}

export async function getCandidates(stage?: CandidateStage): Promise<Candidate[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('candidates')
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .order('created_at', { ascending: false });

  if (stage) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching candidates:', error);
    return [];
  }

  // Fetch signing documents separately to check actual signed status
  const candidateIds = (data || []).map((c: { id: string }) => c.id);

  let signedDocuments: Record<string, boolean> = {};
  if (candidateIds.length > 0) {
    const { data: docs } = await supabaseAdmin!
      .from('signing_documents')
      .select('candidate_id, signed_at')
      .in('candidate_id', candidateIds)
      .not('signed_at', 'is', null);

    // Create a map of candidate_id -> has signed document
    if (docs) {
      docs.forEach((doc: { candidate_id: string }) => {
        signedDocuments[doc.candidate_id] = true;
      });
    }
  }

  // Process data to set term_sheet_signed based on actual signed documents
  const candidates = (data || []).map((candidate: Candidate) => {
    const hasSignedDocument = signedDocuments[candidate.id] || false;
    return {
      ...candidate,
      term_sheet_signed: hasSignedDocument,
    };
  });

  return candidates;
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching candidate:', error);
    return null;
  }

  return data;
}

export async function createCandidate(candidateData: {
  full_name: string;
  email: string;
  phone?: string | null;
  iq_score?: number | null;
  mbti_type?: string | null;
  applied_role: string;
  about?: string | null;
  resume_file_name?: string | null;
  resume_file_path?: string | null;
  resume_file_size?: number | null;
  source?: string | null;
  notes?: string | null;
}): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .insert({
      ...candidateData,
      stage: 'screening',
      checklist: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidate(
  id: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string | null;
    iq_score?: number | null;
    mbti_type?: string | null;
    applied_role?: string;
    about?: string | null;
    resume_file_name?: string | null;
    resume_file_path?: string | null;
    resume_file_size?: number | null;
    source?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .single();

  if (error) {
    console.error('Error updating candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidateStage(
  id: string,
  newStage: CandidateStage
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get current candidate to check role for checklist
  const candidate = await getCandidateById(id);
  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  const updates: Record<string, unknown> = {
    stage: newStage,
    stage_changed_at: new Date().toISOString(),
  };

  // If moving to probation, populate the checklist
  if (newStage === 'probation' && candidate.stage !== 'probation') {
    updates.checklist = getProbationChecklist(candidate.applied_role);
    updates.probation_start_date = new Date().toISOString().split('T')[0];
    // Set end date to 2 weeks from now by default
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    updates.probation_end_date = endDate.toISOString().split('T')[0];
  }

  const { data, error } = await supabaseAdmin!
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      probation_employee:employees!probation_employee_id(full_name, employee_id)
    `)
    .single();

  if (error) {
    console.error('Error updating candidate stage:', error);
    return { success: false, error: error.message };
  }

  return { success: true, candidate: data };
}

export async function updateCandidateChecklist(
  id: string,
  checklist: ChecklistItem[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('candidates')
    .update({ checklist })
    .eq('id', id);

  if (error) {
    console.error('Error updating candidate checklist:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteCandidate(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting candidate:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function convertCandidateToEmployee(
  candidateId: string,
  approvedBy: string,
  employmentType: string = 'full-time'
): Promise<{ success: boolean; employee?: any; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  // Get candidate
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  // Check if candidate is in probation stage
  if (candidate.stage !== 'probation') {
    return { success: false, error: 'Candidate must be in probation stage to be hired' };
  }

  // Check if all required checklist items are completed
  const incompleteRequired = candidate.checklist.filter(
    item => item.required && !item.completed
  );
  if (incompleteRequired.length > 0) {
    return {
      success: false,
      error: `Please complete all required checklist items: ${incompleteRequired.map(i => i.text).join(', ')}`
    };
  }

  // If there's already a probation employee, just update their status
  if (candidate.probation_employee_id) {
    const { data: employee, error: updateError } = await supabaseAdmin!
      .from('employees')
      .update({
        status: 'active',
        employment_type: employmentType,
      })
      .eq('id', candidate.probation_employee_id)
      .select('*, branches!employees_branch_id_fkey(name)')
      .single();

    if (updateError) {
      console.error('Error updating employee status:', updateError);
      return { success: false, error: updateError.message };
    }

    // Update candidate stage to hired
    await updateCandidateStage(candidateId, 'hired');

    return { success: true, employee };
  }

  // Create new employee from candidate
  const { data: employee, error: createError } = await supabaseAdmin!
    .from('employees')
    .insert({
      full_name: candidate.full_name,
      position: candidate.applied_role,
      level: 'junior',
      phone: candidate.phone,
      email: candidate.email,
      status: 'active',
      employment_type: employmentType,
      hire_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (createError || !employee) {
    return { success: false, error: createError?.message || 'Failed to create employee' };
  }

  // Update candidate with the new employee ID and stage
  await supabaseAdmin!
    .from('candidates')
    .update({
      stage: 'hired',
      probation_employee_id: employee.id,
      stage_changed_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  return { success: true, employee };
}

export async function getCandidateStats(): Promise<{
  total: number;
  byStage: Record<CandidateStage, number>;
  thisMonth: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return {
      total: 0,
      byStage: {
        screening: 0,
        interview_1: 0,
        interview_2: 0,
        under_review: 0,
        probation: 0,
        hired: 0,
        rejected: 0,
      },
      thisMonth: 0,
    };
  }

  // Get all candidates
  const { data: candidates, error } = await supabaseAdmin!
    .from('candidates')
    .select('stage, created_at');

  if (error) {
    console.error('Error fetching candidate stats:', error);
    return {
      total: 0,
      byStage: {
        screening: 0,
        interview_1: 0,
        interview_2: 0,
        under_review: 0,
        probation: 0,
        hired: 0,
        rejected: 0,
      },
      thisMonth: 0,
    };
  }

  const byStage: Record<CandidateStage, number> = {
    screening: 0,
    interview_1: 0,
    interview_2: 0,
    under_review: 0,
    probation: 0,
    hired: 0,
    rejected: 0,
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisMonth = 0;

  candidates?.forEach(c => {
    byStage[c.stage as CandidateStage]++;
    if (new Date(c.created_at) >= startOfMonth) {
      thisMonth++;
    }
  });

  return {
    total: candidates?.length || 0,
    byStage,
    thisMonth,
  };
}

// ============================================
// RECRUITMENT FILES
// ============================================

export interface RecruitmentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  category: string;
  role: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Joined
  uploader?: { full_name: string };
}

export async function getRecruitmentFiles(category?: string): Promise<RecruitmentFile[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  let query = supabaseAdmin!
    .from('recruitment_files')
    .select(`
      *,
      uploader:employees!uploaded_by(full_name)
    `)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recruitment files:', error);
    return [];
  }

  return data || [];
}

export async function createRecruitmentFile(fileData: {
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string | null;
  category: string;
  role?: string | null;
  description?: string | null;
  uploaded_by?: string | null;
}): Promise<{ success: boolean; file?: RecruitmentFile; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('recruitment_files')
    .insert(fileData)
    .select()
    .single();

  if (error) {
    console.error('Error creating recruitment file:', error);
    return { success: false, error: error.message };
  }

  return { success: true, file: data };
}

export async function deleteRecruitmentFile(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('recruitment_files')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recruitment file:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
