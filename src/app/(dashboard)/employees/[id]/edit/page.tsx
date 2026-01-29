'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  Shield,
  MessageCircle,
  Unlink,
  User,
  FileText,
  MapPin,
  Banknote,
  Wallet,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  File,
  X,
  UserMinus,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit3,
  Rocket,
  Wifi,
} from 'lucide-react';
import type { UserRole } from '@/types';

const SYSTEM_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'employee', label: 'Employee', description: 'Regular employee with basic access' },
  { value: 'branch_manager', label: 'Branch Manager', description: 'Can manage employees in their branch' },
  { value: 'recruiter', label: 'Recruiter', description: 'Access to recruitment features' },
  { value: 'hr', label: 'HR Manager', description: 'Full HR and employee management' },
  { value: 'accountant', label: 'Accountant', description: 'Can process accounting requests' },
  { value: 'chief_accountant', label: 'Chief Accountant', description: 'Can approve payments and manage accounting' },
  { value: 'legal_manager', label: 'Legal Manager', description: 'Legal department access' },
  { value: 'ceo', label: 'CEO', description: 'Executive access and approvals' },
  { value: 'general_manager', label: 'General Manager', description: 'Full system access' },
];

interface Branch {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface Position {
  id: string;
  name: string;
  name_uz: string | null;
  name_ru: string | null;
  description: string | null;
  level: string | null;
}

interface LegalEntity {
  id: string;
  name: string;
  short_name: string | null;
  inn: string | null;
  branch_id: string | null;
}

interface EmployeeWage {
  id: string;
  employee_id: string;
  legal_entity_id: string;
  wage_amount: number;
  wage_type: 'official' | 'bonus';
  notes: string | null;
  is_active: boolean;
  legal_entities?: LegalEntity;
}

interface EmployeeBranchWage {
  id: string;
  employee_id: string;
  branch_id: string;
  wage_amount: number;
  notes: string | null;
  is_active: boolean;
  branches?: Branch;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string; // Legacy text field
  position_id: string | null; // Reference to positions table
  level: string;
  branch_id: string | null;
  department_id: string | null;
  manager_id: string | null; // Direct manager for org chart
  salary: number | null;
  phone: string | null;
  email: string | null;
  status: string;
  employment_type?: string;
  hire_date: string;
  date_of_birth?: string | null;
  gender?: string | null;
  notes?: string | null;
  telegram_id?: string | null;
  branches?: { name: string };
  departments?: { name: string };
  positions?: Position;
  system_role?: UserRole;
  is_growth_team?: boolean;
  remote_work_enabled?: boolean;
}

interface ManagerOption {
  id: string;
  full_name: string;
  position: string;
}

interface PageData {
  employee: Employee;
  branches: Branch[];
  departments: Department[];
  positions: Position[];
  managers: ManagerOption[]; // Potential managers for org chart
  canEditSalary: boolean;
  canAssignRoles: boolean;
  canDirectEditWages: boolean; // GM can directly edit wages without requesting changes
  userRole: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingWageChange {
  id: string;
  employee_id: string;
  wage_type: 'primary' | 'additional';
  legal_entity_id: string | null;
  branch_id: string | null;
  current_amount: number;
  proposed_amount: number;
  change_type: 'increase' | 'decrease';
  reason: string;
  effective_date: string;
  status: string;
  created_at: string;
  legal_entity?: { name: string };
  branch?: { name: string };
  requester?: { full_name: string };
}

const DOCUMENT_TYPES = [
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'diploma', label: 'Diploma/Certificate' },
  { value: 'other', label: 'Other' },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDocumentTypeLabel(type: string): string {
  const docType = DOCUMENT_TYPES.find(t => t.value === type);
  return docType?.label || type;
}

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '0 UZS';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    position: '', // Legacy text field
    position_id: '', // Reference to positions table
    level: 'junior',
    branch_id: '',
    department_id: '',
    manager_id: '', // Direct manager for org chart
    phone: '',
    email: '',
    status: 'active',
    employment_type: 'full-time',
    system_role: 'employee' as UserRole,
    hire_date: '',
    date_of_birth: '',
    gender: '',
    notes: '',
    is_growth_team: false,
    remote_work_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);

  // Primary wages (bank/legal entities) state
  const [wages, setWages] = useState<EmployeeWage[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loadingWages, setLoadingWages] = useState(true);
  const [showAddWage, setShowAddWage] = useState(false);
  const [newWage, setNewWage] = useState({ entity_id: '', amount: '' });

  // Additional wages (cash/branches) state
  const [branchWages, setBranchWages] = useState<EmployeeBranchWage[]>([]);
  const [showAddBranchWage, setShowAddBranchWage] = useState(false);
  const [newBranchWage, setNewBranchWage] = useState({ branch_id: '', amount: '' });

  // Documents state
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('other');
  const [uploadNotes, setUploadNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Termination request state
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [pendingTermination, setPendingTermination] = useState<{
    id: string;
    status: string;
    reason: string;
    termination_date: string;
    created_at: string;
  } | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [submittingTermination, setSubmittingTermination] = useState(false);

  // Delete employee state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  // Wage change request state
  const [pendingWageChanges, setPendingWageChanges] = useState<PendingWageChange[]>([]);
  const [showWageChangeModal, setShowWageChangeModal] = useState(false);
  const [wageChangeData, setWageChangeData] = useState<{
    wage_type: 'primary' | 'additional';
    legal_entity_id?: string;
    branch_id?: string;
    entity_name: string;
    current_amount: number;
  } | null>(null);
  const [proposedAmount, setProposedAmount] = useState('');
  const [wageChangeReason, setWageChangeReason] = useState('');
  const [wageChangeDate, setWageChangeDate] = useState('');
  const [submittingWageChange, setSubmittingWageChange] = useState(false);

  // Direct wage editing state (for GM)
  const [editingWageId, setEditingWageId] = useState<string | null>(null);
  const [editingWageAmount, setEditingWageAmount] = useState('');
  const [editingBranchWageId, setEditingBranchWageId] = useState<string | null>(null);
  const [editingBranchWageAmount, setEditingBranchWageAmount] = useState('');

  // Calculate totals
  const primaryTotal = wages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const additionalTotal = branchWages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const totalSalary = primaryTotal + additionalTotal;

  // Get employee ID from params
  useEffect(() => {
    params.then(p => setEmployeeId(p.id));
  }, [params]);

  // Fetch initial data
  useEffect(() => {
    if (!employeeId) return;

    async function fetchData() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/edit-data`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/employees');
            return;
          }
          throw new Error('Failed to load employee data');
        }

        const data: PageData = await response.json();
        setPageData(data);

        // Initialize form with employee data
        setFormData({
          full_name: data.employee.full_name,
          position: data.employee.position, // Legacy text field
          position_id: data.employee.position_id || '', // Position from positions table
          level: data.employee.level || 'junior',
          branch_id: data.employee.branch_id || '',
          department_id: data.employee.department_id || '',
          manager_id: data.employee.manager_id || '', // Direct manager for org chart
          phone: data.employee.phone || '',
          email: data.employee.email || '',
          status: data.employee.status,
          employment_type: data.employee.employment_type || 'full-time',
          system_role: (data.employee.system_role || 'employee') as UserRole,
          hire_date: data.employee.hire_date || '',
          date_of_birth: data.employee.date_of_birth || '',
          gender: data.employee.gender || '',
          notes: data.employee.notes || '',
          is_growth_team: data.employee.is_growth_team || false,
          remote_work_enabled: data.employee.remote_work_enabled || false,
        });
        setTelegramId(data.employee.telegram_id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employee data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [employeeId, router]);

  // Fetch wages and legal entities
  useEffect(() => {
    if (!employeeId) return;

    async function fetchWagesData() {
      try {
        const [wagesRes, branchWagesRes, entitiesRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}/wages`),
          fetch(`/api/employees/${employeeId}/branch-wages`),
          fetch('/api/legal-entities'),
        ]);

        if (wagesRes.ok) {
          const data = await wagesRes.json();
          setWages(data.wages || []);
        }

        if (branchWagesRes.ok) {
          const data = await branchWagesRes.json();
          setBranchWages(data.wages || []);
        }

        if (entitiesRes.ok) {
          const data = await entitiesRes.json();
          setLegalEntities(data.entities || []);
        }
      } catch (err) {
        console.error('Error fetching wages data:', err);
      } finally {
        setLoadingWages(false);
      }
    }

    fetchWagesData();
  }, [employeeId]);

  // Fetch documents
  useEffect(() => {
    if (!employeeId) return;

    async function fetchDocuments() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/documents`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoadingDocuments(false);
      }
    }

    fetchDocuments();
  }, [employeeId]);

  // Fetch pending termination request
  useEffect(() => {
    if (!employeeId) return;

    async function fetchPendingTermination() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/termination-status`);
        if (response.ok) {
          const data = await response.json();
          setPendingTermination(data.pendingTermination || null);
        }
      } catch (err) {
        console.error('Error fetching termination status:', err);
      }
    }

    fetchPendingTermination();
  }, [employeeId]);

  // Fetch pending wage change requests
  useEffect(() => {
    if (!employeeId) return;

    async function fetchPendingWageChanges() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/pending-wage-changes`);
        if (response.ok) {
          const data = await response.json();
          setPendingWageChanges(data.pendingChanges || []);
        }
      } catch (err) {
        console.error('Error fetching pending wage changes:', err);
      }
    }

    fetchPendingWageChanges();
  }, [employeeId]);

  // Termination request handler
  const handleSubmitTermination = async () => {
    if (!employeeId || !terminationReason || !terminationDate) return;

    setSubmittingTermination(true);
    setError(null);

    try {
      const response = await fetch('/api/termination-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          reason: terminationReason,
          termination_date: terminationDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit termination request');
      }

      const data = await response.json();
      setPendingTermination({
        id: data.request.id,
        status: 'pending',
        reason: terminationReason,
        termination_date: terminationDate,
        created_at: new Date().toISOString(),
      });
      setShowTerminationModal(false);
      setTerminationReason('');
      setTerminationDate('');
      setSuccess('Termination request submitted. Awaiting GM approval.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit termination request');
    } finally {
      setSubmittingTermination(false);
    }
  };

  // Delete employee handler (permanent deletion)
  const handleDeleteEmployee = async () => {
    if (!employeeId || deleteConfirmText !== 'DELETE') return;

    setDeletingEmployee(true);
    setError(null);

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete employee');
      }

      // Redirect to employees list after successful deletion
      router.push('/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
      setDeletingEmployee(false);
    }
  };

  // Wage change request handlers
  const openWageChangeModal = (
    wageType: 'primary' | 'additional',
    entityId: string,
    entityName: string,
    currentAmount: number,
    isLegalEntity: boolean
  ) => {
    setWageChangeData({
      wage_type: wageType,
      legal_entity_id: isLegalEntity ? entityId : undefined,
      branch_id: !isLegalEntity ? entityId : undefined,
      entity_name: entityName,
      current_amount: currentAmount,
    });
    setProposedAmount(currentAmount.toString());
    setWageChangeReason('');
    // Default to first of next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    setWageChangeDate(nextMonth.toISOString().split('T')[0]);
    setShowWageChangeModal(true);
  };

  const handleSubmitWageChange = async () => {
    if (!employeeId || !wageChangeData || !proposedAmount || !wageChangeReason || !wageChangeDate) return;

    const proposedAmountNum = parseFloat(proposedAmount);
    if (proposedAmountNum === wageChangeData.current_amount) {
      setError('Proposed amount must be different from current amount');
      return;
    }

    setSubmittingWageChange(true);
    setError(null);

    try {
      const response = await fetch('/api/wage-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          wage_type: wageChangeData.wage_type,
          legal_entity_id: wageChangeData.legal_entity_id,
          branch_id: wageChangeData.branch_id,
          current_amount: wageChangeData.current_amount,
          proposed_amount: proposedAmountNum,
          reason: wageChangeReason,
          effective_date: wageChangeDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit wage change request');
      }

      const data = await response.json();
      setPendingWageChanges([data.request, ...pendingWageChanges]);
      setShowWageChangeModal(false);
      setWageChangeData(null);
      setProposedAmount('');
      setWageChangeReason('');
      setWageChangeDate('');
      setSuccess('Wage change request submitted. Awaiting GM approval.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit wage change request');
    } finally {
      setSubmittingWageChange(false);
    }
  };

  // Helper to check if a wage has a pending change
  const hasPendingChange = (wageType: 'primary' | 'additional', entityId: string) => {
    return pendingWageChanges.some(pc =>
      pc.wage_type === wageType &&
      (wageType === 'primary' ? pc.legal_entity_id === entityId : pc.branch_id === entityId)
    );
  };

  // Get pending change for a specific wage
  const getPendingChange = (wageType: 'primary' | 'additional', entityId: string) => {
    return pendingWageChanges.find(pc =>
      pc.wage_type === wageType &&
      (wageType === 'primary' ? pc.legal_entity_id === entityId : pc.branch_id === entityId)
    );
  };

  // Document handlers
  const handleFileUpload = async (file: File) => {
    if (!employeeId) return;

    setUploadingDocument(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', uploadDocType);
      if (uploadNotes) {
        formData.append('notes', uploadNotes);
      }

      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      const data = await response.json();
      setDocuments([data.document, ...documents]);
      setShowUploadForm(false);
      setUploadDocType('other');
      setUploadNotes('');
      setSuccess('Document uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!employeeId) return;
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      setDocuments(documents.filter(d => d.id !== documentId));
      setSuccess('Document deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleDownloadDocument = async (document: EmployeeDocument) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents/${document.id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get download URL');
      }

      const data = await response.json();
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setShowUploadForm(true);
      // Will trigger file input change after form opens
      const file = e.dataTransfer.files[0];
      setTimeout(() => handleFileUpload(file), 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !pageData) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          branch_id: formData.branch_id || null,
          department_id: formData.department_id || null,
          position_id: formData.position_id || null,
          salary: totalSalary,
          system_role: pageData.canAssignRoles ? formData.system_role : undefined,
          hire_date: formData.hire_date || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          notes: formData.notes || null,
          is_growth_team: pageData.canAssignRoles ? formData.is_growth_team : undefined,
          remote_work_enabled: pageData.canAssignRoles ? formData.remote_work_enabled : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update employee');
      }

      setSuccess('Employee updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!telegramId || !employeeId) return;

    setDisconnectingTelegram(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}/telegram`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTelegramId(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect Telegram');
      }
    } catch (err) {
      setError('Failed to disconnect Telegram');
    } finally {
      setDisconnectingTelegram(false);
    }
  };

  const handleAddWage = async () => {
    if (!newWage.entity_id || !newWage.amount || !employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/wages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_id: newWage.entity_id,
          wage_amount: parseFloat(newWage.amount),
          wage_type: 'official',
        }),
      });

      if (response.ok) {
        const wagesRes = await fetch(`/api/employees/${employeeId}/wages`);
        if (wagesRes.ok) {
          const data = await wagesRes.json();
          setWages(data.wages || []);
        }
        setNewWage({ entity_id: '', amount: '' });
        setShowAddWage(false);
      }
    } catch (err) {
      console.error('Error adding wage:', err);
    }
  };

  const handleRemoveWage = async (wageId: string) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/wages?wage_id=${wageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWages(wages.filter(w => w.id !== wageId));
      }
    } catch (err) {
      console.error('Error removing wage:', err);
    }
  };

  const handleAddBranchWage = async () => {
    if (!newBranchWage.branch_id || !newBranchWage.amount || !employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/branch-wages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: newBranchWage.branch_id,
          wage_amount: parseFloat(newBranchWage.amount),
        }),
      });

      if (response.ok) {
        const branchWagesRes = await fetch(`/api/employees/${employeeId}/branch-wages`);
        if (branchWagesRes.ok) {
          const data = await branchWagesRes.json();
          setBranchWages(data.wages || []);
        }
        setNewBranchWage({ branch_id: '', amount: '' });
        setShowAddBranchWage(false);
      }
    } catch (err) {
      console.error('Error adding branch wage:', err);
    }
  };

  const handleRemoveBranchWage = async (wageId: string) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/branch-wages?wage_id=${wageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBranchWages(branchWages.filter(w => w.id !== wageId));
      }
    } catch (err) {
      console.error('Error removing branch wage:', err);
    }
  };

  // Direct wage update (for GM)
  const handleUpdateWage = async (wageId: string, newAmount: number) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/wages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wage_id: wageId,
          wage_amount: newAmount,
        }),
      });

      if (response.ok) {
        setWages(wages.map(w => w.id === wageId ? { ...w, wage_amount: newAmount } : w));
        setEditingWageId(null);
        setEditingWageAmount('');
      }
    } catch (err) {
      console.error('Error updating wage:', err);
    }
  };

  // Direct branch wage update (for GM)
  const handleUpdateBranchWage = async (wageId: string, newAmount: number) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/branch-wages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wage_id: wageId,
          wage_amount: newAmount,
        }),
      });

      if (response.ok) {
        setBranchWages(branchWages.map(w => w.id === wageId ? { ...w, wage_amount: newAmount } : w));
        setEditingBranchWageId(null);
        setEditingBranchWageAmount('');
      }
    } catch (err) {
      console.error('Error updating branch wage:', err);
    }
  };

  // Get available entities (not already assigned)
  const availableEntities = legalEntities.filter(
    e => !wages.some(w => w.legal_entity_id === e.id)
  );

  // Get available branches for additional wages (not already assigned)
  const availableBranches = (pageData?.branches || []).filter(
    b => !branchWages.some(w => w.branch_id === b.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
        <Link href="/employees" className="text-purple-600 hover:underline mt-2 inline-block">
          Back to Employees
        </Link>
      </div>
    );
  }

  const { employee, branches, departments, positions, canEditSalary, canAssignRoles, canDirectEditWages } = pageData;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/employees/${employeeId}`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Employee</h1>
          <p className="text-gray-500 mt-1">{employee.employee_id} - {employee.full_name}</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Basic Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={formData.position_id}
                  onChange={(e) => {
                    const selectedPosition = positions?.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      position_id: e.target.value,
                      // Also update legacy position field for backwards compatibility
                      position: selectedPosition?.name || formData.position,
                      // Auto-set level if position has one
                      level: selectedPosition?.level?.toLowerCase() || formData.level
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                >
                  <option value="">Select Position</option>
                  {positions?.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="junior">Junior</option>
                  <option value="middle">Middle</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">No Branch (HQ)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">No Department</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager (Reports To)
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">No Manager (Top Level)</option>
                  {pageData?.managers
                    ?.filter(m => m.id !== employeeId) // Can't report to self
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.full_name} - {manager.position}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Used for organization chart hierarchy</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="internship">Internship</option>
                  <option value="probation">Probation Period</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Personal Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Contact Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                placeholder="+998 XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Telegram Bot Connection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Telegram Bot Connection
            </h3>
          </div>

          {telegramId ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Connected to C-Space Time Bot</p>
                  <p className="text-xs text-blue-600">Telegram ID: {telegramId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnectTelegram}
                disabled={disconnectingTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Unlink size={14} />
                {disconnectingTelegram ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <MessageCircle size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Not connected to Telegram Bot</p>
              <p className="text-xs text-gray-400 mt-1">Employee can connect via /register command in the bot</p>
            </div>
          )}
        </div>

        {/* System Role Section - only for users who can assign roles */}
        {canAssignRoles && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                System Access Role
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SYSTEM_ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.system_role === role.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="system_role"
                    value={role.value}
                    checked={formData.system_role === role.value}
                    onChange={(e) => setFormData({ ...formData, system_role: e.target.value as UserRole })}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {formData.system_role === 'branch_manager' && (
              <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-sm text-teal-700">
                  <strong>Note:</strong> Branch Manager will have access to manage employees in the branch selected above ({branches.find(b => b.id === formData.branch_id)?.name || 'No branch selected'}).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Growth Team Section - only for users who can assign roles */}
        {canAssignRoles && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Rocket size={18} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Growth Team
              </h3>
            </div>

            <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              formData.is_growth_team
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.is_growth_team}
                onChange={(e) => setFormData({ ...formData, is_growth_team: e.target.checked })}
                className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Growth Team Member</p>
                <p className="text-xs text-gray-500 mt-1">
                  Enable to give this employee access to the Growth section with strategic projects,
                  Metronome Sync updates, and leadership alignment information.
                </p>
              </div>
            </label>

            {formData.is_growth_team && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  <strong>Access granted:</strong> This employee will see the Growth section in their My Portal
                  with visibility into all strategic projects and company updates.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Remote Work Section */}
        {canAssignRoles && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Wifi size={18} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Remote Work
              </h3>
            </div>

            <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              formData.remote_work_enabled
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.remote_work_enabled}
                onChange={(e) => setFormData({ ...formData, remote_work_enabled: e.target.checked })}
                className="mt-1 h-4 w-4 text-blue-500 focus:ring-blue-500 rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Allow Remote Work Check-in</p>
                <p className="text-xs text-gray-500 mt-1">
                  Enable to allow this employee to check in remotely via Telegram bot
                  without GPS verification when their IP doesn&apos;t match the office network.
                </p>
              </div>
            </label>

            {formData.remote_work_enabled && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Remote check-in enabled:</strong> When this employee checks in from outside the office,
                  they will be asked to choose between &quot;I&apos;m in the office&quot; (requires GPS) or &quot;I&apos;m working remotely&quot;
                  (no GPS required, marked as remote).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Salary Summary Section */}
        {canEditSalary && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Salary Summary
              </h3>
            </div>

            {/* Total Salary Display with breakdown */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-600">Total Monthly Salary</span>
                <span className="text-xl font-bold text-purple-700">{formatSalary(totalSalary)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-purple-200">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Banknote size={12} className="text-indigo-500" />
                    Primary: {formatSalary(primaryTotal)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-500" />
                    Additional: {formatSalary(additionalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Wages Section (Bank/Legal Entities) */}
        {canEditSalary && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Primary Wages (Bank)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWage(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Primary Wages List */}
            {loadingWages ? (
              <div className="text-center py-4 text-gray-500">Loading wages...</div>
            ) : wages.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                <Building2 size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No primary wages assigned</p>
                <p className="text-xs text-gray-400">Add wages from legal entities</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wages.map((wage) => {
                  const pendingChange = getPendingChange('primary', wage.legal_entity_id);
                  const isEditing = editingWageId === wage.id;
                  return (
                    <div key={wage.id} className="p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 size={16} className="text-indigo-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {wage.legal_entities?.short_name || wage.legal_entities?.name || wage.legal_entity_id}
                            </p>
                            {wage.legal_entities?.inn && (
                              <p className="text-xs text-gray-500">INN: {wage.legal_entities.inn}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                value={editingWageAmount}
                                onChange={(e) => setEditingWageAmount(e.target.value)}
                                className="w-32 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                min="0"
                                step="100000"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateWage(wage.id, parseFloat(editingWageAmount))}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingWageId(null); setEditingWageAmount(''); }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900">{formatSalary(wage.wage_amount)}</span>
                              {!pendingChange && canDirectEditWages ? (
                                // GM can directly edit and remove
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingWageId(wage.id); setEditingWageAmount(wage.wage_amount.toString()); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
                                  >
                                    <Edit3 size={12} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWage(wage.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    Remove
                                  </button>
                                </>
                              ) : !pendingChange ? (
                                // Non-GM can request change
                                <button
                                  type="button"
                                  onClick={() => openWageChangeModal(
                                    'primary',
                                    wage.legal_entity_id,
                                    wage.legal_entities?.short_name || wage.legal_entities?.name || wage.legal_entity_id,
                                    wage.wage_amount,
                                    true
                                  )}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
                                >
                                  <Edit3 size={12} />
                                  Request Change
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Pending change indicator */}
                      {pendingChange && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700">
                            <Clock size={14} />
                            <span className="text-xs font-medium">Pending Change Request</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-amber-600">
                            {pendingChange.change_type === 'increase' ? (
                              <ArrowUpCircle size={12} className="text-green-500" />
                            ) : (
                              <ArrowDownCircle size={12} className="text-red-500" />
                            )}
                            <span>
                              {formatSalary(pendingChange.current_amount)} → {formatSalary(pendingChange.proposed_amount)}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span>Effective: {formatDate(pendingChange.effective_date)}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Reason: {pendingChange.reason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Primary Wage Form */}
            {showAddWage && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg space-y-3 border border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={newWage.entity_id}
                    onChange={(e) => setNewWage({ ...newWage, entity_id: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Select legal entity...</option>
                    {availableEntities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.short_name || entity.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newWage.amount}
                    onChange={(e) => setNewWage({ ...newWage, amount: e.target.value })}
                    placeholder="Amount (UZS)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    min="0"
                    step="100000"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddWage(false)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddWage}
                    disabled={!newWage.entity_id || !newWage.amount}
                    className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Add Primary Wage
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Wages Section (Cash/Branches) */}
        {canEditSalary && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Additional Wages (Cash)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranchWage(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Additional Wages List */}
            {loadingWages ? (
              <div className="text-center py-4 text-gray-500">Loading wages...</div>
            ) : branchWages.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No additional wages assigned</p>
                <p className="text-xs text-gray-400">Add cash wages from branches</p>
              </div>
            ) : (
              <div className="space-y-2">
                {branchWages.map((wage) => {
                  const pendingChange = getPendingChange('additional', wage.branch_id);
                  const isEditing = editingBranchWageId === wage.id;
                  return (
                    <div key={wage.id} className="p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {wage.branches?.name || wage.branch_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                value={editingBranchWageAmount}
                                onChange={(e) => setEditingBranchWageAmount(e.target.value)}
                                className="w-32 px-2 py-1 text-sm border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                min="0"
                                step="100000"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateBranchWage(wage.id, parseFloat(editingBranchWageAmount))}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingBranchWageId(null); setEditingBranchWageAmount(''); }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900">{formatSalary(wage.wage_amount)}</span>
                              {!pendingChange && canDirectEditWages ? (
                                // GM can directly edit and remove
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingBranchWageId(wage.id); setEditingBranchWageAmount(wage.wage_amount.toString()); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 bg-white border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                                  >
                                    <Edit3 size={12} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBranchWage(wage.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    Remove
                                  </button>
                                </>
                              ) : !pendingChange ? (
                                // Non-GM can request change
                                <button
                                  type="button"
                                  onClick={() => openWageChangeModal(
                                    'additional',
                                    wage.branch_id,
                                    wage.branches?.name || wage.branch_id,
                                    wage.wage_amount,
                                    false
                                  )}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 bg-white border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                                >
                                  <Edit3 size={12} />
                                  Request Change
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Pending change indicator */}
                      {pendingChange && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700">
                            <Clock size={14} />
                            <span className="text-xs font-medium">Pending Change Request</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-amber-600">
                            {pendingChange.change_type === 'increase' ? (
                              <ArrowUpCircle size={12} className="text-green-500" />
                            ) : (
                              <ArrowDownCircle size={12} className="text-red-500" />
                            )}
                            <span>
                              {formatSalary(pendingChange.current_amount)} → {formatSalary(pendingChange.proposed_amount)}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span>Effective: {formatDate(pendingChange.effective_date)}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Reason: {pendingChange.reason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Additional Wage Form */}
            {showAddBranchWage && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-lg space-y-3 border border-emerald-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={newBranchWage.branch_id}
                    onChange={(e) => setNewBranchWage({ ...newBranchWage, branch_id: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    <option value="">Select branch...</option>
                    {availableBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newBranchWage.amount}
                    onChange={(e) => setNewBranchWage({ ...newBranchWage, amount: e.target.value })}
                    placeholder="Amount (UZS)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    min="0"
                    step="100000"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBranchWage(false)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBranchWage}
                    disabled={!newBranchWage.branch_id || !newBranchWage.amount}
                    className="flex-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    Add Additional Wage
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <File size={18} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Documents
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Upload size={14} />
              Upload
            </button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Upload Document</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadDocType('other');
                    setUploadNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Add any notes about this document"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    disabled={uploadingDocument}
                  />
                  {uploadingDocument ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-purple-600" size={20} />
                      <span className="text-sm text-purple-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                      <p className="text-sm text-gray-600">
                        <span className="text-purple-600 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG, WebP, DOC, DOCX (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Documents List */}
          {loadingDocuments ? (
            <div className="text-center py-4 text-gray-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
              <File size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No documents uploaded</p>
              <p className="text-xs text-gray-400">Upload term sheets, contracts, passports, etc.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Notes
            </h3>
          </div>

          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Any special notes about this employee (e.g., termination date, special conditions)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
          />
        </div>

        {/* Termination Section - Only show for active/probation employees */}
        {formData.status !== 'terminated' && (
          <div className="bg-white rounded-xl border border-red-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UserMinus size={18} className="text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Employee Termination
              </h3>
            </div>

            {pendingTermination ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Termination Request Pending</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      A termination request has been submitted and is awaiting General Manager approval.
                    </p>
                    <div className="mt-2 text-sm text-yellow-600">
                      <p><strong>Reason:</strong> {pendingTermination.reason}</p>
                      <p><strong>Termination Date:</strong> {new Date(pendingTermination.termination_date).toLocaleDateString()}</p>
                      <p><strong>Submitted:</strong> {new Date(pendingTermination.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Initiate employee termination process. This requires General Manager approval before the employee is terminated.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTerminationModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  <UserMinus size={18} />
                  Request Termination
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete Employee Section - Permanent removal */}
        <div className="bg-white rounded-xl border border-red-300 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 size={18} className="text-red-600" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Delete Employee
            </h3>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete this employee record from the system. This action cannot be undone. Use this only for mistakenly created accounts.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Trash2 size={18} />
              Delete Employee
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/employees/${employeeId}`}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Termination Request Modal */}
      {showTerminationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request Employee Termination</h3>
                <p className="text-sm text-gray-500">This requires GM approval</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Termination *
                </label>
                <textarea
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  rows={3}
                  placeholder="Provide a detailed reason for termination..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Working Day *
                </label>
                <input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <strong>Note:</strong> Upon approval, the employee will be:
                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                  <li>Marked as terminated in the system</li>
                  <li>Disconnected from the Telegram bot</li>
                  <li>Have all wage assignments deactivated</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTerminationModal(false);
                  setTerminationReason('');
                  setTerminationDate('');
                }}
                disabled={submittingTermination}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTermination}
                disabled={submittingTermination || !terminationReason || !terminationDate}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingTermination ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wage Change Request Modal */}
      {showWageChangeModal && wageChangeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Edit3 size={24} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Request Wage Change</h3>
                <p className="text-sm text-gray-500">This requires GM approval</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Wage info display */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  {wageChangeData.wage_type === 'primary' ? 'Primary Wage' : 'Additional Wage'}
                </p>
                <p className="text-sm font-medium text-gray-900">{wageChangeData.entity_name}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Current: {formatSalary(wageChangeData.current_amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Amount (UZS) *
                </label>
                <input
                  type="number"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                  placeholder="Enter new wage amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  min="0"
                  step="100000"
                  required
                />
                {proposedAmount && parseFloat(proposedAmount) !== wageChangeData.current_amount && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    parseFloat(proposedAmount) > wageChangeData.current_amount ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(proposedAmount) > wageChangeData.current_amount ? (
                      <><ArrowUpCircle size={12} /> Increase by {formatSalary(parseFloat(proposedAmount) - wageChangeData.current_amount)}</>
                    ) : (
                      <><ArrowDownCircle size={12} /> Decrease by {formatSalary(wageChangeData.current_amount - parseFloat(proposedAmount))}</>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Change *
                </label>
                <textarea
                  value={wageChangeReason}
                  onChange={(e) => setWageChangeReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Performance review - promotion, Annual raise, Role change..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date *
                </label>
                <input
                  type="date"
                  value={wageChangeDate}
                  onChange={(e) => setWageChangeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>Note:</strong> This change request will be sent to the General Manager for approval. The wage will only be updated after approval.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowWageChangeModal(false);
                  setWageChangeData(null);
                  setProposedAmount('');
                  setWageChangeReason('');
                  setWageChangeDate('');
                }}
                disabled={submittingWageChange}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitWageChange}
                disabled={
                  submittingWageChange ||
                  !proposedAmount ||
                  !wageChangeReason ||
                  !wageChangeDate ||
                  parseFloat(proposedAmount) === wageChangeData.current_amount
                }
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingWageChange ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Employee Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  You are about to permanently delete <strong>{employee.full_name}</strong> ({employee.employee_id}) from the system.
                  This will remove all associated data including wages, documents, and attendance records.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={deletingEmployee}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployee}
                disabled={deletingEmployee || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingEmployee ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
