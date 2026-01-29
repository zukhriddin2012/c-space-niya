import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: 'term_sheet' | 'contract' | 'passport' | 'id_card' | 'diploma' | 'other';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'diploma', label: 'Diploma/Certificate' },
  { value: 'other', label: 'Other' },
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee documents:', error);
    return [];
  }

  return data || [];
}

export async function addEmployeeDocument(document: {
  employee_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_by?: string;
  notes?: string;
}): Promise<{ success: boolean; document?: EmployeeDocument; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .insert({
      employee_id: document.employee_id,
      document_type: document.document_type,
      file_name: document.file_name,
      file_path: document.file_path,
      file_size: document.file_size,
      mime_type: document.mime_type || null,
      uploaded_by: document.uploaded_by || null,
      notes: document.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding employee document:', error);
    return { success: false, error: error.message };
  }

  return { success: true, document: data };
}

export async function getEmployeeDocumentById(documentId: string): Promise<EmployeeDocument | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('employee_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return data;
}

export async function deleteEmployeeDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateEmployeeDocumentNotes(
  documentId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabaseAdmin!
    .from('employee_documents')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) {
    console.error('Error updating document notes:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
