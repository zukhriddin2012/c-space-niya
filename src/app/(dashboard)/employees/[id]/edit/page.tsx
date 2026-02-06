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
  Briefcase,
  Phone,
  Mail,
  Calendar,
  KeyRound,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button, Input, Select, Card, Tabs, TabPanel, Modal, Badge } from '@/components/ui';

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
  position: string;
  position_id: string | null;
  level: string;
  branch_id: string | null;
  department_id: string | null;
  manager_id: string | null;
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
  managers: ManagerOption[];
  canEditSalary: boolean;
  canAssignRoles: boolean;
  canDirectEditWages: boolean;
  hasOperatorPin: boolean;
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

// Tab definitions
type TabId = 'profile' | 'employment' | 'wages' | 'documents' | 'admin';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    position_id: '',
    level: 'junior',
    branch_id: '',
    department_id: '',
    manager_id: '',
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

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Primary wages state
  const [wages, setWages] = useState<EmployeeWage[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loadingWages, setLoadingWages] = useState(true);
  const [showAddWage, setShowAddWage] = useState(false);
  const [newWage, setNewWage] = useState({ entity_id: '', amount: '' });

  // Additional wages state
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

  // Termination state
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

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  // PIN management state
  const [hasOperatorPin, setHasOperatorPin] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Wage change state
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

  // Direct wage editing state
  const [editingWageId, setEditingWageId] = useState<string | null>(null);
  const [editingWageAmount, setEditingWageAmount] = useState('');
  const [editingBranchWageId, setEditingBranchWageId] = useState<string | null>(null);
  const [editingBranchWageAmount, setEditingBranchWageAmount] = useState('');

  // Computed values
  const primaryTotal = wages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const additionalTotal = branchWages.reduce((sum, w) => sum + (w.wage_amount || 0), 0);
  const totalSalary = primaryTotal + additionalTotal;

  // Tab configuration
  const tabs = [
    { id: 'profile' as TabId, label: t.employeeEdit.tabProfile, icon: <User size={16} /> },
    { id: 'employment' as TabId, label: t.employeeEdit.tabEmployment, icon: <Briefcase size={16} /> },
    { id: 'wages' as TabId, label: t.employeeEdit.tabWages, icon: <Wallet size={16} />, badge: pageData?.canEditSalary ? undefined : '🔒' },
    { id: 'documents' as TabId, label: t.employeeEdit.tabDocuments, icon: <FileText size={16} />, badge: documents.length > 0 ? documents.length : undefined },
    { id: 'admin' as TabId, label: t.employeeEdit.tabAdmin, icon: <Shield size={16} />, badge: pageData?.canAssignRoles ? undefined : '🔒' },
  ];

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

        setFormData({
          full_name: data.employee.full_name,
          position: data.employee.position,
          position_id: data.employee.position_id || '',
          level: data.employee.level || 'junior',
          branch_id: data.employee.branch_id || '',
          department_id: data.employee.department_id || '',
          manager_id: data.employee.manager_id || '',
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
        setHasOperatorPin(data.hasOperatorPin || false);
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

  // Fetch pending termination
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

  // Fetch pending wage changes
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

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = t.common.required;
    }

    if (!formData.position_id) {
      errors.position_id = t.common.required;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
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

      router.push('/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
      setDeletingEmployee(false);
    }
  };

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

  const hasPendingChange = (wageType: 'primary' | 'additional', entityId: string) => {
    return pendingWageChanges.some(pc =>
      pc.wage_type === wageType &&
      (wageType === 'primary' ? pc.legal_entity_id === entityId : pc.branch_id === entityId)
    );
  };

  const getPendingChange = (wageType: 'primary' | 'additional', entityId: string) => {
    return pendingWageChanges.find(pc =>
      pc.wage_type === wageType &&
      (wageType === 'primary' ? pc.legal_entity_id === entityId : pc.branch_id === entityId)
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!employeeId) return;

    setUploadingDocument(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('document_type', uploadDocType);
      if (uploadNotes) {
        formDataUpload.append('notes', uploadNotes);
      }

      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formDataUpload,
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
      setSuccess(t.employeeEdit.uploadSuccess);
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
      setSuccess(t.employeeEdit.deleteSuccess);
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
      const file = e.dataTransfer.files[0];
      setTimeout(() => handleFileUpload(file), 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !pageData) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(data.error || t.employeeEdit.saveError);
      }

      setSuccess(t.employeeEdit.saveSuccess);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.employeeEdit.saveError);
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

  const handleSetOperatorPin = async () => {
    if (!employeeId) return;

    setPinError(null);
    setPinSuccess(null);

    // Validate
    if (!pinValue || pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (pinValue !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }

    setPinSaving(true);
    try {
      const response = await fetch('/api/reception/operator-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue, employeeId }),
      });

      if (response.ok) {
        setHasOperatorPin(true);
        setPinValue('');
        setPinConfirm('');
        setPinSuccess('Operator PIN has been set successfully');
        setTimeout(() => setPinSuccess(null), 4000);
      } else {
        const data = await response.json();
        if (data.error === 'pin_already_taken') {
          setPinError('This PIN is already used by another employee in the same branch. Please choose a different PIN.');
        } else if (data.error === 'insufficient_permissions') {
          setPinError('You do not have permission to set PINs for other employees');
        } else {
          setPinError(data.error || 'Failed to set PIN');
        }
      }
    } catch (err) {
      setPinError('Failed to set PIN. Please try again.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleRemoveOperatorPin = async () => {
    if (!employeeId) return;

    setPinError(null);
    setPinSuccess(null);
    setPinSaving(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}/operator-pin`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHasOperatorPin(false);
        setPinValue('');
        setPinConfirm('');
        setPinSuccess('Operator PIN has been removed');
        setTimeout(() => setPinSuccess(null), 4000);
      } else {
        const data = await response.json();
        setPinError(data.error || 'Failed to remove PIN');
      }
    } catch (err) {
      setPinError('Failed to remove PIN. Please try again.');
    } finally {
      setPinSaving(false);
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

  const handleUpdateWage = async (wageId: string, newAmount: number) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/wages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wage_id: wageId, wage_amount: newAmount }),
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

  const handleUpdateBranchWage = async (wageId: string, newAmount: number) => {
    if (!employeeId) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/branch-wages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wage_id: wageId, wage_amount: newAmount }),
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

  // Available entities/branches
  const availableEntities = legalEntities.filter(
    e => !wages.some(w => w.legal_entity_id === e.id)
  );

  const availableBranches = (pageData?.branches || []).filter(
    b => !branchWages.some(w => w.branch_id === b.id)
  );

  // Loading state
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
          {t.common.back}
        </Link>
      </div>
    );
  }

  const { employee, branches, departments, positions, canEditSalary, canAssignRoles, canDirectEditWages } = pageData;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/employees/${employeeId}`}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t.employeeEdit.title}</h1>
          <p className="text-gray-500 mt-1">{employee.employee_id} - {employee.full_name}</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as TabId)}
        className="mb-6"
      />

      <form onSubmit={handleSubmit}>
        {/* Profile Tab */}
        <TabPanel tabId="profile" activeTab={activeTab}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card title={t.employeeEdit.basicInfo}>
              <div className="space-y-4">
                <Input
                  label={t.employeeEdit.fullName}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  error={validationErrors.full_name}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label={t.employeeEdit.position}
                    value={formData.position_id}
                    onChange={(e) => {
                      const selectedPosition = positions?.find(p => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        position_id: e.target.value,
                        position: selectedPosition?.name || formData.position,
                        level: selectedPosition?.level?.toLowerCase() || formData.level
                      });
                    }}
                    options={positions?.map(pos => ({ value: pos.id, label: pos.name })) || []}
                    placeholder={t.employeeEdit.selectPosition}
                    error={validationErrors.position_id}
                    required
                  />

                  <Select
                    label={t.employeeEdit.level}
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    options={[
                      { value: 'junior', label: t.employees.junior },
                      { value: 'middle', label: t.employees.middle },
                      { value: 'senior', label: t.employees.senior },
                      { value: 'executive', label: t.employees.executive },
                    ]}
                  />
                </div>
              </div>
            </Card>

            {/* Personal Information */}
            <Card title={t.employeeEdit.personalInfo}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label={t.employeeEdit.hireDate}
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />

                <Input
                  label={t.employeeEdit.dateOfBirth}
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />

                <Select
                  label={t.employeeEdit.gender}
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: '', label: t.employeeEdit.notSpecified },
                    { value: 'male', label: t.employeeEdit.male },
                    { value: 'female', label: t.employeeEdit.female },
                  ]}
                />
              </div>
            </Card>

            {/* Contact Information */}
            <Card title={t.employeeEdit.contactInfo}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t.employeeEdit.phone}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 XX XXX XX XX"
                  leftIcon={<Phone size={16} />}
                />

                <Input
                  label={t.employeeEdit.email}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={validationErrors.email}
                  leftIcon={<Mail size={16} />}
                />
              </div>
            </Card>

            {/* Notes */}
            <Card title={t.employeeEdit.notes}>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any special notes about this employee..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              />
            </Card>
          </div>
        </TabPanel>

        {/* Employment Tab */}
        <TabPanel tabId="employment" activeTab={activeTab}>
          <div className="space-y-6">
            <Card title={t.employeeEdit.tabEmployment}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label={t.employeeEdit.branch}
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    options={[
                      { value: '', label: t.employeeEdit.noBranch },
                      ...branches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                  />

                  <Select
                    label={t.employees.department}
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    options={[
                      { value: '', label: t.employeeEdit.noDepartment },
                      ...departments?.map(d => ({ value: d.id, label: d.name })) || []
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Select
                      label={t.employeeEdit.reportsTo}
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                      options={[
                        { value: '', label: t.employeeEdit.noManager },
                        ...pageData?.managers
                          ?.filter(m => m.id !== employeeId)
                          .map(m => ({ value: m.id, label: `${m.full_name} - ${m.position}` })) || []
                      ]}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t.employeeEdit.managerHint}</p>
                  </div>

                  <Select
                    label={t.employeeEdit.status}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { value: 'active', label: t.employees.active },
                      { value: 'probation', label: t.employees.probation },
                      { value: 'inactive', label: t.employees.inactive },
                      { value: 'terminated', label: t.employees.terminated },
                    ]}
                  />
                </div>

                <Select
                  label={t.employeeEdit.employmentType}
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  options={[
                    { value: 'full-time', label: t.employees.fullTime },
                    { value: 'part-time', label: t.employees.partTime },
                    { value: 'internship', label: t.employees.internship },
                    { value: 'probation', label: 'Probation Period' },
                  ]}
                />
              </div>
            </Card>

            {/* Termination Section */}
            {formData.status !== 'terminated' && (
              <Card
                title={t.employeeEdit.terminationSection}
                className="border-red-200"
              >
                {pendingTermination ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">{t.employeeEdit.pendingTermination}</p>
                        <div className="mt-2 text-sm text-yellow-600">
                          <p><strong>Reason:</strong> {pendingTermination.reason}</p>
                          <p><strong>Date:</strong> {new Date(pendingTermination.termination_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Initiate employee termination process. This requires General Manager approval.
                    </p>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setShowTerminationModal(true)}
                      leftIcon={<UserMinus size={18} />}
                    >
                      {t.employeeEdit.requestTermination}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Delete Section */}
            <Card
              title={t.employeeEdit.dangerZone}
              className="border-red-300"
            >
              <p className="text-sm text-gray-600 mb-4">
                {t.employeeEdit.deleteWarning}
              </p>
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                leftIcon={<Trash2 size={18} />}
              >
                {t.employeeEdit.deleteEmployee}
              </Button>
            </Card>
          </div>
        </TabPanel>

        {/* Wages Tab */}
        <TabPanel tabId="wages" activeTab={activeTab}>
          {canEditSalary ? (
            <div className="space-y-6">
              {/* Salary Summary */}
              <Card title={t.employeeEdit.totalSalary}>
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-600">{t.employeeEdit.totalSalary}</span>
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
              </Card>

              {/* Primary Wages */}
              <Card
                title={t.employeeEdit.primaryWages}
                description={t.employeeEdit.primaryWagesHint}
              >
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddWage(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    {t.employeeEdit.addWage}
                  </Button>
                </div>

                {loadingWages ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : wages.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                    <Building2 size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t.employeeEdit.noWagesYet}</p>
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
                                  {wage.legal_entities?.short_name || wage.legal_entities?.name}
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
                                    className="w-32 px-2 py-1 text-sm border border-indigo-300 rounded"
                                    min="0"
                                    step="100000"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleUpdateWage(wage.id, parseFloat(editingWageAmount))}
                                  >
                                    <Save size={12} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingWageId(null); setEditingWageAmount(''); }}
                                  >
                                    <X size={12} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold text-gray-900">{formatSalary(wage.wage_amount)}</span>
                                  {!pendingChange && canDirectEditWages && (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setEditingWageId(wage.id); setEditingWageAmount(wage.wage_amount.toString()); }}
                                      >
                                        <Edit3 size={12} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveWage(wage.id)}
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                  {!pendingChange && !canDirectEditWages && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openWageChangeModal(
                                        'primary',
                                        wage.legal_entity_id,
                                        wage.legal_entities?.short_name || wage.legal_entities?.name || '',
                                        wage.wage_amount,
                                        true
                                      )}
                                    >
                                      {t.employeeEdit.requestChange}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {pendingChange && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <Badge variant="warning" size="sm">{t.employeeEdit.pendingChange}</Badge>
                              <p className="text-xs text-amber-600 mt-1">
                                {formatSalary(pendingChange.current_amount)} → {formatSalary(pendingChange.proposed_amount)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAddWage && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={newWage.entity_id}
                        onChange={(e) => setNewWage({ ...newWage, entity_id: e.target.value })}
                        options={availableEntities.map(e => ({ value: e.id, label: e.short_name || e.name }))}
                        placeholder={t.employeeEdit.legalEntity}
                      />
                      <Input
                        type="number"
                        value={newWage.amount}
                        onChange={(e) => setNewWage({ ...newWage, amount: e.target.value })}
                        placeholder={t.employeeEdit.amount}
                        min={0}
                        step={100000}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button type="button" variant="secondary" onClick={() => setShowAddWage(false)}>
                        {t.common.cancel}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddWage}
                        disabled={!newWage.entity_id || !newWage.amount}
                      >
                        {t.employeeEdit.addWage}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Additional Wages */}
              <Card
                title={t.employeeEdit.additionalWages}
                description={t.employeeEdit.additionalWagesHint}
              >
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddBranchWage(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    {t.employeeEdit.addWage}
                  </Button>
                </div>

                {loadingWages ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : branchWages.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                    <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t.employeeEdit.noWagesYet}</p>
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
                              <p className="text-sm font-medium text-gray-900">
                                {wage.branches?.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isEditing ? (
                                <>
                                  <input
                                    type="number"
                                    value={editingBranchWageAmount}
                                    onChange={(e) => setEditingBranchWageAmount(e.target.value)}
                                    className="w-32 px-2 py-1 text-sm border border-emerald-300 rounded"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleUpdateBranchWage(wage.id, parseFloat(editingBranchWageAmount))}
                                  >
                                    <Save size={12} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingBranchWageId(null); setEditingBranchWageAmount(''); }}
                                  >
                                    <X size={12} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">{formatSalary(wage.wage_amount)}</span>
                                  {!pendingChange && canDirectEditWages && (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setEditingBranchWageId(wage.id); setEditingBranchWageAmount(wage.wage_amount.toString()); }}
                                      >
                                        <Edit3 size={12} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveBranchWage(wage.id)}
                                      >
                                        <Trash2 size={12} className="text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                  {!pendingChange && !canDirectEditWages && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openWageChangeModal(
                                        'additional',
                                        wage.branch_id,
                                        wage.branches?.name || '',
                                        wage.wage_amount,
                                        false
                                      )}
                                    >
                                      {t.employeeEdit.requestChange}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {pendingChange && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <Badge variant="warning" size="sm">{t.employeeEdit.pendingChange}</Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAddBranchWage && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={newBranchWage.branch_id}
                        onChange={(e) => setNewBranchWage({ ...newBranchWage, branch_id: e.target.value })}
                        options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
                        placeholder={t.employeeEdit.branch}
                      />
                      <Input
                        type="number"
                        value={newBranchWage.amount}
                        onChange={(e) => setNewBranchWage({ ...newBranchWage, amount: e.target.value })}
                        placeholder={t.employeeEdit.amount}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button type="button" variant="secondary" onClick={() => setShowAddBranchWage(false)}>
                        {t.common.cancel}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddBranchWage}
                        disabled={!newBranchWage.branch_id || !newBranchWage.amount}
                      >
                        {t.employeeEdit.addWage}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <Shield size={32} className="mx-auto mb-2 text-gray-300" />
                <p>You don&apos;t have permission to view wages</p>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel tabId="documents" activeTab={activeTab}>
          <Card title={t.employeeEdit.documentsTitle}>
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowUploadForm(true)}
                leftIcon={<Upload size={14} />}
              >
                {t.employeeEdit.uploadDocument}
              </Button>
            </div>

            {showUploadForm && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">{t.employeeEdit.uploadDocument}</h4>
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
                  <Select
                    label={t.employeeEdit.documentType}
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    options={DOCUMENT_TYPES.map(type => ({ value: type.value, label: type.label }))}
                  />

                  <Input
                    label={t.employeeEdit.notes}
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Add any notes..."
                  />

                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
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
                        <p className="text-sm text-gray-600">{t.employeeEdit.dragDropHint}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loadingDocuments ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                <File size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t.employeeEdit.noDocuments}</p>
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
                          <Badge size="sm">{getDocumentTypeLabel(doc.document_type)}</Badge>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabPanel>

        {/* Admin Tab */}
        <TabPanel tabId="admin" activeTab={activeTab}>
          {canAssignRoles ? (
            <div className="space-y-6">
              {/* System Role */}
              <Card
                title={t.employeeEdit.systemRole}
                description={t.employeeEdit.systemRoleHint}
              >
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
              </Card>

              {/* Telegram Status */}
              <Card title={t.employeeEdit.telegramStatus}>
                {telegramId ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageCircle size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">{t.employeeEdit.connected}</p>
                        <p className="text-xs text-blue-600">ID: {telegramId}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleDisconnectTelegram}
                      isLoading={disconnectingTelegram}
                      leftIcon={<Unlink size={14} />}
                    >
                      {t.employeeEdit.disconnect}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <MessageCircle size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">{t.employeeEdit.notConnected}</p>
                  </div>
                )}
              </Card>

              {/* Growth Team */}
              <Card title={t.employeeEdit.growthTeam}>
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
                    <p className="text-sm font-medium text-gray-900">{t.employeeEdit.growthTeam}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.employeeEdit.growthTeamHint}</p>
                  </div>
                </label>
              </Card>

              {/* Remote Work */}
              <Card title={t.employeeEdit.remoteWork}>
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
                    <p className="text-sm font-medium text-gray-900">{t.employeeEdit.remoteWork}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.employeeEdit.remoteWorkHint}</p>
                  </div>
                </label>
              </Card>

              {/* Operator PIN Management */}
              <Card title="Operator PIN" description="Set a 4-digit PIN for reception mode operator switching">
                <div className="space-y-4">
                  {/* Current PIN Status */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${
                    hasOperatorPin ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      hasOperatorPin ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <KeyRound size={20} className={hasOperatorPin ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${hasOperatorPin ? 'text-green-900' : 'text-gray-700'}`}>
                        {hasOperatorPin ? 'PIN is set' : 'No PIN configured'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasOperatorPin
                          ? 'Employee can switch operators in reception mode'
                          : 'Set a PIN to enable operator switching'}
                      </p>
                    </div>
                    {hasOperatorPin && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveOperatorPin}
                        isLoading={pinSaving}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Set / Change PIN Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {hasOperatorPin ? 'New PIN' : 'PIN'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4}"
                        maxLength={4}
                        value={pinValue}
                        onChange={(e) => {
                          setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setPinError(null);
                        }}
                        placeholder="4 digits"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4}"
                        maxLength={4}
                        value={pinConfirm}
                        onChange={(e) => {
                          setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setPinError(null);
                        }}
                        placeholder="Repeat PIN"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                  </div>

                  {/* Error / Success messages */}
                  {pinError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{pinError}</p>
                    </div>
                  )}
                  {pinSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      <p className="text-sm text-green-700">{pinSuccess}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSetOperatorPin}
                    isLoading={pinSaving}
                    disabled={!pinValue || !pinConfirm || pinValue.length !== 4 || pinConfirm.length !== 4}
                    leftIcon={<KeyRound size={14} />}
                  >
                    {hasOperatorPin ? 'Change PIN' : 'Set PIN'}
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <Shield size={32} className="mx-auto mb-2 text-gray-300" />
                <p>You don&apos;t have permission to access admin settings</p>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Action Buttons - Always visible */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <Link
            href={`/employees/${employeeId}`}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
          >
            {t.common.cancel}
          </Link>
          <Button
            type="submit"
            isLoading={saving}
            leftIcon={<Save size={16} />}
            className="flex-1"
          >
            {t.common.save}
          </Button>
        </div>
      </form>

      {/* Termination Modal */}
      {showTerminationModal && (
        <Modal
          isOpen={showTerminationModal}
          onClose={() => {
            setShowTerminationModal(false);
            setTerminationReason('');
            setTerminationDate('');
          }}
          title={t.employeeEdit.requestTermination}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.employeeEdit.terminationReason} *
              </label>
              <textarea
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                required
              />
            </div>

            <Input
              label={`${t.employeeEdit.terminationDate} *`}
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTerminationModal(false)}
                disabled={submittingTermination}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleSubmitTermination}
                disabled={submittingTermination || !terminationReason || !terminationDate}
                isLoading={submittingTermination}
                className="flex-1"
              >
                {t.common.submit}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Wage Change Modal */}
      {showWageChangeModal && wageChangeData && (
        <Modal
          isOpen={showWageChangeModal}
          onClose={() => {
            setShowWageChangeModal(false);
            setWageChangeData(null);
          }}
          title={t.employeeEdit.requestChange}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{wageChangeData.entity_name}</p>
              <p className="text-lg font-bold text-gray-900">
                Current: {formatSalary(wageChangeData.current_amount)}
              </p>
            </div>

            <Input
              label={`${t.employeeEdit.amount} *`}
              type="number"
              value={proposedAmount}
              onChange={(e) => setProposedAmount(e.target.value)}
              min={0}
              step={100000}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <textarea
                value={wageChangeReason}
                onChange={(e) => setWageChangeReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none resize-none"
              />
            </div>

            <Input
              label="Effective Date *"
              type="date"
              value={wageChangeDate}
              onChange={(e) => setWageChangeDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowWageChangeModal(false)}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleSubmitWageChange}
                disabled={!proposedAmount || !wageChangeReason || !wageChangeDate || parseFloat(proposedAmount) === wageChangeData.current_amount}
                isLoading={submittingWageChange}
                className="flex-1"
              >
                {t.common.submit}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteConfirmText('');
          }}
          title={t.employeeEdit.deleteEmployee}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                You are about to permanently delete <strong>{employee.full_name}</strong> ({employee.employee_id}).
                {t.employeeEdit.deleteWarning}
              </p>
            </div>

            <Input
              label={t.employeeEdit.typeDeleteConfirm}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingEmployee}
                className="flex-1"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteEmployee}
                disabled={deletingEmployee || deleteConfirmText !== 'DELETE'}
                isLoading={deletingEmployee}
                className="flex-1"
              >
                {t.employeeEdit.deleteEmployee}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
